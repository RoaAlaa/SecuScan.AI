// scripts/checkKnowledge.js
const prisma = require("../prismaClient");

async function checkKnowledge() {
  console.log("🔍 Checking knowledge base...\n");

  // 1. Count total knowledge chunks
  const total = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*)::int as count 
    FROM "DocumentChunk" 
    WHERE "sourceType" = 'knowledge'
  `);
  console.log(`📊 Total knowledge chunks: ${total[0].count}`);

  // 2. Show breakdown by file
  const byFile = await prisma.$queryRawUnsafe(`
    SELECT 
      metadata->>'source' as file,
      COUNT(*)::int as chunks
    FROM "DocumentChunk" 
    WHERE "sourceType" = 'knowledge'
    GROUP BY metadata->>'source'
    ORDER BY file
  `);

  console.log("\n📁 Breakdown by file:");
  byFile.forEach((f) => {
    console.log(`   - ${f.file}: ${f.chunks} chunks`);
  });

  // 3. Show sample content
  const samples = await prisma.$queryRawUnsafe(`
    SELECT 
      metadata->>'source' as file,
      LEFT(content, 100) as preview,
      metadata->>'topic' as topic
    FROM "DocumentChunk" 
    WHERE "sourceType" = 'knowledge'
    LIMIT 3
  `);

  console.log("\n📝 Sample chunks:");
  samples.forEach((s, i) => {
    console.log(`\n${i + 1}. ${s.file} (${s.topic}):`);
    console.log(`   "${s.preview}..."`);
  });

  await prisma.$disconnect();
}

checkKnowledge().catch(console.error);
