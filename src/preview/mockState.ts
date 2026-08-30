export type StudentStatus = "present" | "absent" | "excused" | "pending";

export type PreviewStudent = {
  classNo: string;
  erp: string;
  name: string;
  statuses: StudentStatus[];
  namingPenalty: number;
};

export type PreviewGroup = {
  id: string;
  members: string[];
  capacity: number;
};

export type PreviewClaim = {
  id: string;
  assignment: string;
  claimedOn: string;
  days: number;
};

export type JoinRequestStatus = "pending" | "accepted" | "declined";

export type JoinRequest = {
  id: string;
  groupId: string;
  studentName: string;
  erp: string;
  status: JoinRequestStatus;
};

export const previewSessions = [
  { id: "s1", label: "S1", date: "25 Aug", weekday: "Tue" },
  { id: "s2", label: "S2", date: "27 Aug", weekday: "Thu" },
  { id: "s3", label: "S3", date: "01 Sep", weekday: "Tue" },
  { id: "s4", label: "S4", date: "03 Sep", weekday: "Thu" },
  { id: "s5", label: "S5", date: "08 Sep", weekday: "Tue" },
  { id: "s6", label: "S6", date: "10 Sep", weekday: "Thu" },
];

const firstNames = [
  "Areeba",
  "Hamza",
  "Zoya",
  "Bilal",
  "Maham",
  "Usman",
  "Sana",
  "Hassan",
  "Ayesha",
  "Daniyal",
  "Mariam",
  "Saad",
];
const lastNames = [
  "Khan",
  "Ahmed",
  "Raza",
  "Malik",
  "Hussain",
  "Ali",
  "Qureshi",
  "Siddiqui",
  "Iqbal",
  "Sheikh",
  "Farooq",
  "Nawaz",
];

export const previewStudents: PreviewStudent[] = Array.from(
  { length: 136 },
  (_, index) => {
    const erp = String(12001 + index).padStart(5, "0");
    const name = `${firstNames[index % firstNames.length]} ${lastNames[(index * 3) % lastNames.length]}`;
    const statuses: StudentStatus[] = previewSessions.map((_, sessionIndex) => {
      if ((index + sessionIndex * 2) % 29 === 0) return "absent";
      if ((index + sessionIndex) % 41 === 0) return "excused";
      if (sessionIndex === 5 && index % 7 === 0) return "pending";
      return "present";
    });

    return {
      classNo: `BBA-${(index % 4) + 1}`,
      erp,
      name,
      statuses,
      namingPenalty: index % 37 === 0 ? 1 : 0,
    };
  },
);

export const initialGroups: PreviewGroup[] = [
  {
    id: "Group 1",
    leader: "Areeba Khan",
    members: ["Areeba Khan", "Hamza Ahmed"],
    capacity: 5,
  },
  {
    id: "Group 2",
    leader: "Maham Raza",
    members: ["Maham Raza", "Bilal Malik", "Zoya Hussain"],
    capacity: 5,
  },
  {
    id: "Group 3",
    leader: "Ayesha Siddiqui",
    members: ["Ayesha Siddiqui"],
    capacity: 5,
  },
  { id: "Group 4", leader: "Usman Ali", members: ["Usman Ali"], capacity: 5 },
];

export const initialClaims: PreviewClaim[] = [
  {
    id: "claim-1",
    assignment: "Case brief 01",
    claimedOn: "18 Aug 2026",
    days: 1,
  },
];

export const currentStudent = {
  name: "Test Student",
  erp: "00000",
  email: "student.00000@khi.iba.edu.pk",
  classNo: "BBA-1",
};

export const initialJoinRequests: JoinRequest[] = [];
