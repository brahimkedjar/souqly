import { PrismaClient } from '@prisma/client';
import { categorySeedData } from './categories.data';

const prisma = new PrismaClient();

async function main() {
  for (const [parentIndex, category] of categorySeedData.entries()) {
    const parent = await prisma.category.upsert({
      where: { slug: category.slug },
      update: {
        nameFr: category.nameFr,
        nameAr: category.nameAr,
        sortOrder: parentIndex,
        isActive: true,
        parentId: null,
      },
      create: {
        slug: category.slug,
        nameFr: category.nameFr,
        nameAr: category.nameAr,
        sortOrder: parentIndex,
        isActive: true,
      },
    });

    for (const [childIndex, child] of category.children.entries()) {
      await prisma.category.upsert({
        where: { slug: child.slug },
        update: {
          nameFr: child.nameFr,
          nameAr: child.nameAr,
          sortOrder: childIndex,
          isActive: true,
          parentId: parent.id,
        },
        create: {
          slug: child.slug,
          nameFr: child.nameFr,
          nameAr: child.nameAr,
          sortOrder: childIndex,
          isActive: true,
          parentId: parent.id,
        },
      });
    }
  }

  console.log('Categories seeded.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
