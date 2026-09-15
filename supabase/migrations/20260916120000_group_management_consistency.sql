-- Make student group formation deterministic and deadline-controlled.
-- This migration is safe to apply after the existing group migrations.
BEGIN;

ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS group_formation_deadline timestamptz;

CREATE OR REPLACE FUNCTION public.get_group_formation_status()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'deadline', (SELECT group_formation_deadline FROM public.app_settings ORDER BY created_at LIMIT 1),
    'is_locked', COALESCE((SELECT group_formation_deadline IS NOT NULL AND now() > group_formation_deadline FROM public.app_settings ORDER BY created_at LIMIT 1), false)
  )
$$;

REVOKE ALL ON FUNCTION public.get_group_formation_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_group_formation_status() TO authenticated;

-- Preserve the current policy when upgrading: use the most common existing
-- deadline, and never invent a new deadline for an existing deployment.
UPDATE public.app_settings
SET group_formation_deadline = source.deadline,
    updated_at = now()
FROM (
  SELECT student_edit_locked_at AS deadline
  FROM public.student_groups
  GROUP BY student_edit_locked_at
  ORDER BY COUNT(*) DESC, student_edit_locked_at DESC
  LIMIT 1
) source
WHERE group_formation_deadline IS NULL;

CREATE OR REPLACE FUNCTION public.student_group_formation_open()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT group_formation_deadline IS NULL OR now() <= group_formation_deadline
     FROM public.app_settings ORDER BY created_at LIMIT 1),
    true
  )
$$;

CREATE OR REPLACE FUNCTION public.student_group_edit_open(p_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.student_groups
    WHERE id = p_group_id AND now() <= student_edit_locked_at
  )
$$;

REVOKE ALL ON FUNCTION public.student_group_formation_open() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.student_group_formation_open() TO authenticated;
REVOKE ALL ON FUNCTION public.student_group_edit_open(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.student_group_edit_open(uuid) TO authenticated;

-- Student-created groups use the global deadline and the lowest available
-- positive number. The old integer signature remains as a compatibility
-- wrapper for older clients but ignores the obsolete number input.
CREATE OR REPLACE FUNCTION public.student_create_group()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_student_erp text;
  v_group_id uuid;
  v_group_number integer;
  v_deadline timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT public.student_group_formation_open() THEN
    RAISE EXCEPTION 'Group formation is closed after the deadline';
  END IF;
  v_email := auth.jwt() ->> 'email';
  v_student_erp := public.current_student_erp_from_auth();
  IF v_student_erp IS NULL THEN RAISE EXCEPTION 'Could not derive ERP from email'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('student-group-number-allocation'));
  IF NOT EXISTS (SELECT 1 FROM public.students_roster WHERE erp = v_student_erp) THEN
    RAISE EXCEPTION 'Student ERP not found in roster';
  END IF;
  IF EXISTS (SELECT 1 FROM public.student_group_members WHERE student_erp = v_student_erp) THEN
    RAISE EXCEPTION 'You are already assigned to a group';
  END IF;
  SELECT COALESCE((SELECT group_formation_deadline FROM public.app_settings ORDER BY created_at LIMIT 1), now() + interval '3 days')
    INTO v_deadline;
  SELECT n INTO v_group_number
  FROM generate_series(1, (SELECT COALESCE(MAX(group_number), 0) + 1 FROM public.student_groups)) n
  WHERE NOT EXISTS (SELECT 1 FROM public.student_groups WHERE group_number = n)
  ORDER BY n LIMIT 1;
  INSERT INTO public.student_groups(group_number, created_by_erp, created_by_email, created_by_role, student_edit_locked_at)
  VALUES (v_group_number, v_student_erp, v_email, 'student', v_deadline)
  RETURNING id INTO v_group_id;
  INSERT INTO public.student_group_members(group_id, student_erp, added_by_erp, added_by_role)
  VALUES (v_group_id, v_student_erp, v_student_erp, 'student');
  RETURN public.get_student_groups_state();
END;
$$;

CREATE OR REPLACE FUNCTION public.student_create_group(p_group_number integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.student_create_group();
END;
$$;

REVOKE ALL ON FUNCTION public.student_create_group() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.student_create_group() TO authenticated;
REVOKE ALL ON FUNCTION public.student_create_group(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.student_create_group(integer) TO authenticated;

-- Restore the intended POC action: add only an ungrouped roster student.
CREATE OR REPLACE FUNCTION public.student_add_group_member(p_group_number integer, p_student_erp text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_erp text := public.current_student_erp_from_auth();
  v_group public.student_groups%ROWTYPE;
  v_count integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF v_actor_erp IS NULL OR p_student_erp IS NULL OR btrim(p_student_erp) = '' THEN RAISE EXCEPTION 'Student ERP is required'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('student-group-member:' || v_actor_erp));
  PERFORM pg_advisory_xact_lock(hashtext('student-group-member:' || btrim(p_student_erp)));
  SELECT * INTO v_group FROM public.student_groups WHERE group_number = p_group_number FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Group % does not exist', p_group_number; END IF;
  IF v_group.created_by_erp IS DISTINCT FROM v_actor_erp THEN RAISE EXCEPTION 'Only the group POC can add members'; END IF;
  IF NOT public.student_group_edit_open(v_group.id) THEN RAISE EXCEPTION 'Group % is locked for student edits', p_group_number; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.students_roster WHERE erp = btrim(p_student_erp)) THEN RAISE EXCEPTION 'Student ERP not found in roster'; END IF;
  IF EXISTS (SELECT 1 FROM public.student_group_members WHERE student_erp = btrim(p_student_erp)) THEN RAISE EXCEPTION 'Student is already assigned to a group'; END IF;
  SELECT COUNT(*)::integer INTO v_count FROM public.student_group_members WHERE group_id = v_group.id;
  IF v_count >= 5 THEN RAISE EXCEPTION 'Group % is already full', p_group_number; END IF;
  INSERT INTO public.student_group_members(group_id, student_erp, added_by_erp, added_by_role)
  VALUES (v_group.id, btrim(p_student_erp), v_actor_erp, 'student');
  RETURN public.get_student_groups_state();
END;
$$;

-- All student mutations honor the global formation deadline. Existing group
-- deadlines still permit a TA-reopened group after global closure.
CREATE OR REPLACE FUNCTION public.student_request_group_join(p_group_number integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_group public.student_groups%ROWTYPE; v_erp text := public.current_student_erp_from_auth(); v_count integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_group FROM public.student_groups WHERE group_number = p_group_number FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Group % does not exist', p_group_number; END IF;
  IF NOT public.student_group_edit_open(v_group.id) THEN RAISE EXCEPTION 'Group % is locked for student edits', p_group_number; END IF;
  IF EXISTS (SELECT 1 FROM public.student_group_members WHERE student_erp = v_erp) THEN RAISE EXCEPTION 'You are already assigned to a group'; END IF;
  IF EXISTS (SELECT 1 FROM public.student_group_join_requests WHERE student_erp = v_erp AND status = 'pending') THEN RAISE EXCEPTION 'You already have a pending group request'; END IF;
  SELECT COUNT(*)::integer INTO v_count FROM public.student_group_members WHERE group_id = v_group.id;
  IF v_count >= 5 THEN RAISE EXCEPTION 'Group % is already full', p_group_number; END IF;
  INSERT INTO public.student_group_join_requests(group_id, student_erp) VALUES (v_group.id, v_erp);
  RETURN public.get_student_groups_state();
END;
$$;

CREATE OR REPLACE FUNCTION public.student_cancel_group_join_request(p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_erp text := public.current_student_erp_from_auth(); v_group_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT group_id INTO v_group_id FROM public.student_group_join_requests
  WHERE id = p_request_id AND student_erp = v_erp AND status = 'pending' FOR UPDATE;
  IF v_group_id IS NULL THEN RAISE EXCEPTION 'Pending group request not found'; END IF;
  IF NOT public.student_group_edit_open(v_group_id) THEN RAISE EXCEPTION 'Group is locked for student edits'; END IF;
  UPDATE public.student_group_join_requests SET status = 'cancelled', responded_at = now(), responded_by_email = auth.jwt() ->> 'email'
  WHERE id = p_request_id;
  RETURN public.get_student_groups_state();
END;
$$;

CREATE OR REPLACE FUNCTION public.respond_to_group_join_request(p_request_id uuid, p_accept boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_email text := auth.jwt() ->> 'email'; v_actor_erp text := public.current_student_erp_from_auth();
  v_request public.student_group_join_requests%ROWTYPE; v_group public.student_groups%ROWTYPE; v_count integer; v_is_ta boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  v_is_ta := public.is_ta(v_email);
  SELECT * INTO v_request FROM public.student_group_join_requests WHERE id = p_request_id AND status = 'pending' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pending group request not found'; END IF;
  SELECT * INTO v_group FROM public.student_groups WHERE id = v_request.group_id FOR UPDATE;
  IF NOT v_is_ta AND v_group.created_by_erp IS DISTINCT FROM v_actor_erp THEN RAISE EXCEPTION 'Only the group POC or a TA can respond to requests'; END IF;
  IF NOT v_is_ta AND NOT public.student_group_edit_open(v_group.id) THEN RAISE EXCEPTION 'Group is locked for student edits'; END IF;
  IF p_accept THEN
    PERFORM pg_advisory_xact_lock(hashtext('student-group-member:' || v_request.student_erp));
    IF EXISTS (SELECT 1 FROM public.student_group_members WHERE student_erp = v_request.student_erp) THEN RAISE EXCEPTION 'Student is already assigned to a group'; END IF;
    SELECT COUNT(*)::integer INTO v_count FROM public.student_group_members WHERE group_id = v_group.id;
    IF v_count >= 5 THEN RAISE EXCEPTION 'Group % is already full', v_group.group_number; END IF;
    INSERT INTO public.student_group_members(group_id, student_erp, added_by_erp, added_by_role)
    VALUES (v_group.id, v_request.student_erp, COALESCE(v_actor_erp, v_email), CASE WHEN v_is_ta THEN 'ta' ELSE 'student' END);
    UPDATE public.student_group_join_requests SET status = 'accepted', responded_at = now(), responded_by_email = v_email WHERE id = p_request_id;
  ELSE
    UPDATE public.student_group_join_requests SET status = 'declined', responded_at = now(), responded_by_email = v_email WHERE id = p_request_id;
  END IF;
  IF v_is_ta THEN RETURN public.list_group_admin_state(); END IF;
  RETURN public.get_student_groups_state();
END;
$$;

CREATE OR REPLACE FUNCTION public.student_remove_group_member(p_group_number integer, p_student_erp text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_actor text := public.current_student_erp_from_auth(); v_group public.student_groups%ROWTYPE; v_count integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_group FROM public.student_groups WHERE group_number = p_group_number FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Group % does not exist', p_group_number; END IF;
  IF v_group.created_by_erp IS DISTINCT FROM v_actor THEN RAISE EXCEPTION 'Only the group POC can remove members'; END IF;
  IF NOT public.student_group_edit_open(v_group.id) THEN RAISE EXCEPTION 'Group is locked for student edits'; END IF;
  SELECT COUNT(*)::integer INTO v_count FROM public.student_group_members WHERE group_id = v_group.id;
  IF p_student_erp = v_actor AND v_count > 1 THEN RAISE EXCEPTION 'POC cannot leave while other members remain'; END IF;
  DELETE FROM public.student_group_members WHERE group_id = v_group.id AND student_erp = btrim(p_student_erp);
  IF NOT FOUND THEN RAISE EXCEPTION 'Student is not assigned to this group'; END IF;
  PERFORM public.reassign_group_creator_if_needed(v_group.id, btrim(p_student_erp), auth.jwt() ->> 'email');
  RETURN public.get_student_groups_state();
END;
$$;

CREATE OR REPLACE FUNCTION public.student_leave_group()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_actor text := public.current_student_erp_from_auth(); v_email text := auth.jwt() ->> 'email'; v_group public.student_groups%ROWTYPE; v_count integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT g.* INTO v_group FROM public.student_group_members gm JOIN public.student_groups g ON g.id = gm.group_id WHERE gm.student_erp = v_actor FOR UPDATE OF g;
  IF NOT FOUND THEN RAISE EXCEPTION 'You are not assigned to a group'; END IF;
  IF NOT public.student_group_edit_open(v_group.id) THEN RAISE EXCEPTION 'Group is locked for student edits'; END IF;
  SELECT COUNT(*)::integer INTO v_count FROM public.student_group_members WHERE group_id = v_group.id;
  IF v_group.created_by_erp IS NOT DISTINCT FROM v_actor AND v_count > 1 THEN RAISE EXCEPTION 'POC cannot leave while other members remain'; END IF;
  DELETE FROM public.student_group_members WHERE group_id = v_group.id AND student_erp = v_actor;
  PERFORM public.reassign_group_creator_if_needed(v_group.id, v_actor, v_email);
  RETURN public.get_student_groups_state();
END;
$$;

CREATE OR REPLACE FUNCTION public.ta_set_group_edit_deadline_all(p_deadline timestamptz)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_email text; v_updated integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_ta(auth.jwt() ->> 'email') THEN RAISE EXCEPTION 'Only TAs can change group deadlines'; END IF;
  IF p_deadline IS NULL THEN RAISE EXCEPTION 'Deadline is required'; END IF;
  UPDATE public.app_settings SET group_formation_deadline = p_deadline, updated_at = now();
  UPDATE public.student_groups SET student_edit_locked_at = p_deadline, updated_at = now();
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN jsonb_build_object('success', true, 'updated_groups', v_updated, 'deadline', p_deadline);
END;
$$;

CREATE OR REPLACE FUNCTION public.ta_enable_group_editing_all()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_deadline timestamptz := now() + interval '3 days';
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_ta(auth.jwt() ->> 'email') THEN RAISE EXCEPTION 'Only TAs can change group deadlines'; END IF;
  UPDATE public.app_settings SET group_formation_deadline = v_deadline, updated_at = now();
  UPDATE public.student_groups SET student_edit_locked_at = v_deadline, updated_at = now();
  RETURN public.list_group_admin_state();
END;
$$;

-- Reopen only selected existing groups; global formation stays closed.
CREATE OR REPLACE FUNCTION public.ta_enable_group_editing_selected(p_group_numbers integer[])
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_ta(auth.jwt() ->> 'email') THEN RAISE EXCEPTION 'Only TAs can change group deadlines'; END IF;
  UPDATE public.student_groups SET student_edit_locked_at = now() + interval '3 days', updated_at = now()
  WHERE group_number = ANY(COALESCE(p_group_numbers, ARRAY[]::integer[]));
  RETURN public.list_group_admin_state();
END;
$$;

-- Atomic single-group renumbering. Group IDs and all memberships remain intact.
CREATE OR REPLACE FUNCTION public.ta_rename_group(p_old_group_number integer, p_new_group_number integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_email text; v_id uuid;
BEGIN
  v_email := auth.jwt() ->> 'email';
  IF auth.uid() IS NULL OR NOT public.is_ta(v_email) THEN RAISE EXCEPTION 'Only TAs can rename groups'; END IF;
  IF p_old_group_number IS NULL OR p_new_group_number IS NULL OR p_old_group_number < 1 OR p_new_group_number < 1 THEN RAISE EXCEPTION 'Group numbers must be positive'; END IF;
  IF p_old_group_number = p_new_group_number THEN RETURN public.list_group_admin_state(); END IF;
  PERFORM pg_advisory_xact_lock(hashtext('student-group-number-allocation'));
  SELECT id INTO v_id FROM public.student_groups WHERE group_number = p_old_group_number FOR UPDATE;
  IF v_id IS NULL THEN RAISE EXCEPTION 'Group % does not exist', p_old_group_number; END IF;
  IF EXISTS (SELECT 1 FROM public.student_groups WHERE group_number = p_new_group_number) THEN RAISE EXCEPTION 'Group % already exists', p_new_group_number; END IF;
  UPDATE public.student_groups SET group_number = p_new_group_number, updated_at = now() WHERE id = v_id;
  UPDATE public.late_day_adjustments SET reason = replace(reason, ':' || p_old_group_number::text, ':' || p_new_group_number::text)
  WHERE reason LIKE 'group-shared-sync:' || p_old_group_number::text || '%' OR reason = 'group-sync-max:' || p_old_group_number::text;
  RETURN public.list_group_admin_state();
END;
$$;

CREATE OR REPLACE FUNCTION public.ta_normalize_group_numbers()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_ta(auth.jwt() ->> 'email') THEN RAISE EXCEPTION 'Only TAs can normalize groups'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('student-group-number-allocation'));
  CREATE TEMP TABLE group_number_map ON COMMIT DROP AS
    SELECT id, group_number AS old_number, row_number() OVER (ORDER BY group_number, id)::integer AS new_number
    FROM public.student_groups;
  -- Temporary high positive values avoid the unique/check constraints while swapping.
  UPDATE public.student_groups g SET group_number = 1000000000 + m.new_number
  FROM group_number_map m WHERE m.id = g.id;
  -- Keep derived adjustment labels intelligible after renumbering.
  FOR r IN SELECT old_number, new_number FROM group_number_map WHERE old_number <> new_number ORDER BY old_number LOOP
    UPDATE public.late_day_adjustments
    SET reason = replace(reason, ':' || r.old_number::text, ':' || r.new_number::text)
    WHERE reason LIKE 'group-shared-sync:' || r.old_number::text || '%' OR reason = 'group-sync-max:' || r.old_number::text;
  END LOOP;
  UPDATE public.student_groups g SET group_number = m.new_number, updated_at = now()
  FROM group_number_map m WHERE m.id = g.id;
  RETURN public.list_group_admin_state();
END;
$$;

REVOKE ALL ON FUNCTION public.ta_rename_group(integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ta_rename_group(integer, integer) TO authenticated;
REVOKE ALL ON FUNCTION public.ta_normalize_group_numbers() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ta_normalize_group_numbers() TO authenticated;

COMMIT;
