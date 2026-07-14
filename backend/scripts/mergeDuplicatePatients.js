// One-time cleanup for patients that were duplicated before createPatient()
// started merging by contact number. Groups existing Patient rows by
// contact, keeps the OLDEST row per group as the canonical record (so its
// id keeps working anywhere it's already been shared/linked), reassigns
// every Consultation/Prescription/Fee/Meeting from the newer duplicate rows
// onto the canonical one, refreshes the canonical row's mutable fields from
// the most recent duplicate, and deletes the now-empty duplicates.
//
// Usage:
//   node scripts/mergeDuplicatePatients.js          # dry run, prints what it would do
//   node scripts/mergeDuplicatePatients.js --apply   # actually performs the merge

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const APPLY = process.argv.includes("--apply");

async function main() {
  const patients = await prisma.patient.findMany({
    where: { contact: { not: null } },
    orderBy: { createdAt: "asc" },
  });

  const groups = new Map();
  for (const p of patients) {
    const key = p.contact.trim();
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }

  const duplicateGroups = [...groups.entries()].filter(([, rows]) => rows.length > 1);

  if (duplicateGroups.length === 0) {
    console.log("No duplicate patients found. Nothing to do.");
    return;
  }

  console.log(`Found ${duplicateGroups.length} contact number(s) with duplicate patient records.\n`);

  for (const [contact, rows] of duplicateGroups) {
    const canonical = rows[0]; // oldest
    const duplicates = rows.slice(1);
    const mostRecent = rows[rows.length - 1];

    console.log(`Contact ${contact}:`);
    console.log(`  keeping   ${canonical.id}  (${canonical.name}, created ${canonical.createdAt.toISOString()})`);
    for (const d of duplicates) {
      console.log(`  merging   ${d.id}  (${d.name}, created ${d.createdAt.toISOString()}) -> ${canonical.id}`);
    }

    if (!APPLY) continue;

    const duplicateIds = duplicates.map((d) => d.id);

    await prisma.$transaction([
      prisma.consultation.updateMany({ where: { patientId: { in: duplicateIds } }, data: { patientId: canonical.id } }),
      prisma.prescription.updateMany({ where: { patientId: { in: duplicateIds } }, data: { patientId: canonical.id } }),
      prisma.fee.updateMany({ where: { patientId: { in: duplicateIds } }, data: { patientId: canonical.id } }),
      prisma.meeting.updateMany({ where: { patientId: { in: duplicateIds } }, data: { patientId: canonical.id } }),
      prisma.patient.update({
        where: { id: canonical.id },
        data: {
          name: mostRecent.name,
          description: mostRecent.description,
          conditionLevel: mostRecent.conditionLevel,
          doctorId: mostRecent.doctorId,
          createdAt: mostRecent.createdAt,
        },
      }),
      prisma.patient.deleteMany({ where: { id: { in: duplicateIds } } }),
    ]);

    console.log(`  done.\n`);
  }

  if (!APPLY) {
    console.log("\nDry run only — no changes made. Re-run with --apply to perform the merge.");
  } else {
    console.log("\nMerge complete.");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());