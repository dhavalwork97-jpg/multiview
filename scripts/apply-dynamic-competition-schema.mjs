import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const schemaPath = path.join(root, "prisma", "schema.prisma");
let schema = fs.readFileSync(schemaPath, "utf8");

if (!/\bsport\s+String/.test(schema)) {
  const anchor = /(^\s*game\s+String[^\n]*\n)/m;
  if (!anchor.test(schema)) throw new Error("Could not find Tournament.game in prisma/schema.prisma");
  schema = schema.replace(anchor, `$1  sport            String            @default("esports")\n  competitionType  String            @default("tournament")\n  participantMode  String            @default("individual")\n  scoringMode      String            @default("points")\n  competitionRules Json?\n`);
  fs.writeFileSync(schemaPath, schema);
  console.log("Updated prisma/schema.prisma with dynamic competition fields.");
} else {
  console.log("Dynamic competition fields already exist; schema unchanged.");
}
