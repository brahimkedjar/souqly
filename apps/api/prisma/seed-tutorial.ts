import { ListingStatus, PrismaClient, Role, ProductStatus, OrderStatus, DeliveryStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { categorySeedData } from './categories.data';

const prisma = new PrismaClient();

const demoPassword = process.env.DEMO_PASSWORD || 'Souqly123!';

const storeSeeds = [
  {
    email: 'seller1@souqly.local',
    name: 'Kamel',
    store: {
      name: 'Souqly Tech',
      description: 'Electro et gadgets fiables pour le quotidien.',
      location: 'Alger, DZ',
      logoUrl: imageUrl('souqly-tech-logo'),
      bannerUrl: imageUrl('souqly-tech-banner', 1200),
      isVerified: true,
    },
  },
  {
    email: 'seller2@souqly.local',
    name: 'Lina',
    store: {
      name: 'Souqly Maison',
      description: 'Maison, deco et mode selectionnee.',
      location: 'Oran, DZ',
      logoUrl: imageUrl('souqly-maison-logo'),
      bannerUrl: imageUrl('souqly-maison-banner', 1200),
      isVerified: false,
    },
  },
];

const productSeeds = [
  // Store 0: Tech
  {
    storeIndex: 0,
    title: 'Smartphone Souqly S1',
    description: 'Ecran 6.6", 128GB, batterie 5000mAh.',
    price: '55990',
    stockQty: 25,
    categorySlug: 'phones',
    sku: 'SQ-S1',
    attributes: { color: 'Noir', storage: '128GB' },
    tags: ['electronics', 'phones', 'tutorial'],
  },
  {
    storeIndex: 0,
    title: 'Smartphone Souqly S1 Pro',
    description: 'Ecran 6.8", 256GB, camera 64MP.',
    price: '69990',
    stockQty: 18,
    categorySlug: 'phones',
    sku: 'SQ-S1P',
    attributes: { color: 'Bleu', storage: '256GB' },
    tags: ['electronics', 'phones', 'tutorial'],
  },
  {
    storeIndex: 0,
    title: 'Laptop Souqly L14',
    description: '14" FHD, i5, 8GB RAM, SSD 512GB.',
    price: '149900',
    stockQty: 10,
    categorySlug: 'computers',
    sku: 'SQ-L14',
    attributes: { cpu: 'i5', ram: '8GB', storage: '512GB SSD' },
    tags: ['electronics', 'laptop', 'tutorial'],
  },
  {
    storeIndex: 0,
    title: 'Laptop Souqly L16',
    description: '16" FHD, i7, 16GB RAM, SSD 1TB.',
    price: '229900',
    stockQty: 6,
    categorySlug: 'computers',
    sku: 'SQ-L16',
    attributes: { cpu: 'i7', ram: '16GB', storage: '1TB SSD' },
    tags: ['electronics', 'laptop', 'tutorial'],
  },
  {
    storeIndex: 0,
    title: 'Casque Bluetooth AirTone',
    description: 'Audio HD, reduction de bruit, autonomie 30h.',
    price: '14990',
    stockQty: 22,
    categorySlug: 'audio',
    sku: 'SQ-AT',
    attributes: { color: 'Noir', battery: '30h' },
    tags: ['audio', 'headphones', 'tutorial'],
  },
  {
    storeIndex: 0,
    title: 'Enceinte Pocket Beat',
    description: 'Mini enceinte bluetooth, autonomie 12h.',
    price: '6990',
    stockQty: 35,
    categorySlug: 'audio',
    sku: 'SQ-PB',
    attributes: { color: 'Rouge', battery: '12h' },
    tags: ['audio', 'speaker', 'tutorial'],
  },
  {
    storeIndex: 0,
    title: 'TV Souqly 4K 50"',
    description: 'Smart TV 4K HDR, Netflix/YouTube.',
    price: '89990',
    stockQty: 8,
    categorySlug: 'tv-video',
    sku: 'SQ-TV50',
    attributes: { size: '50"', resolution: '4K' },
    tags: ['electronics', 'tv', 'tutorial'],
  },
  {
    storeIndex: 0,
    title: 'Caméra Action X',
    description: '4K, stabilisation, etanche.',
    price: '18990',
    stockQty: 12,
    categorySlug: 'audio',
    sku: 'SQ-CAM',
    attributes: { resolution: '4K', waterproof: '10m' },
    tags: ['electronics', 'camera', 'tutorial'],
  },
  {
    storeIndex: 0,
    title: 'Powerbank 20000mAh',
    description: 'Charge rapide 22.5W, 2 ports USB.',
    price: '5990',
    stockQty: 40,
    categorySlug: 'phones',
    sku: 'SQ-PB20',
    attributes: { capacity: '20000mAh' },
    tags: ['electronics', 'accessory', 'tutorial'],
  },
  {
    storeIndex: 0,
    title: 'Montre Fit S',
    description: 'Suivi sport, sommeil, 7 jours autonomie.',
    price: '12990',
    stockQty: 20,
    categorySlug: 'phones',
    sku: 'SQ-FIT',
    attributes: { battery: '7 jours' },
    tags: ['electronics', 'wearable', 'tutorial'],
  },
  // Store 1: Maison & Mode
  {
    storeIndex: 1,
    title: 'Blender Smooth Mix',
    description: 'Blender 600W, bol 1.5L.',
    price: '6990',
    stockQty: 28,
    categorySlug: 'kitchen',
    sku: 'SM-BL',
    attributes: { power: '600W', capacity: '1.5L' },
    tags: ['home', 'kitchen', 'tutorial'],
  },
  {
    storeIndex: 1,
    title: 'Set Casseroles Inox',
    description: 'Set 6 pieces en inox.',
    price: '8990',
    stockQty: 18,
    categorySlug: 'kitchen',
    sku: 'SM-CS',
    attributes: { pieces: 6, material: 'Inox' },
    tags: ['home', 'kitchen', 'tutorial'],
  },
  {
    storeIndex: 1,
    title: 'Table Dining Nord',
    description: 'Table bois, style moderne.',
    price: '19990',
    stockQty: 6,
    categorySlug: 'furniture',
    sku: 'SM-TB',
    attributes: { material: 'Bois', seats: '6' },
    tags: ['home', 'furniture', 'tutorial'],
  },
  {
    storeIndex: 1,
    title: 'Chaise Confort',
    description: 'Chaise robuste, dossier doux.',
    price: '5490',
    stockQty: 16,
    categorySlug: 'furniture',
    sku: 'SM-CH',
    attributes: { material: 'Bois', color: 'Beige' },
    tags: ['home', 'furniture', 'tutorial'],
  },
  {
    storeIndex: 1,
    title: 'Lampe Deco Aura',
    description: 'Lampe de salon, lumiere chaude.',
    price: '4290',
    stockQty: 22,
    categorySlug: 'decor',
    sku: 'SM-LD',
    attributes: { color: 'Or' },
    tags: ['home', 'decor', 'tutorial'],
  },
  {
    storeIndex: 1,
    title: 'Tapis Cosy 160x230',
    description: 'Tapis doux pour salon.',
    price: '10990',
    stockQty: 9,
    categorySlug: 'decor',
    sku: 'SM-TP',
    attributes: { size: '160x230' },
    tags: ['home', 'decor', 'tutorial'],
  },
  {
    storeIndex: 1,
    title: 'Robe Soleil',
    description: 'Robe fluide, collection ete.',
    price: '7990',
    stockQty: 20,
    categorySlug: 'fashion-women',
    sku: 'SM-RB',
    attributes: { size: 'S/M/L', color: 'Vert' },
    tags: ['fashion', 'women', 'tutorial'],
  },
  {
    storeIndex: 1,
    title: 'Veste Urban',
    description: 'Veste legere mi-saison.',
    price: '8990',
    stockQty: 14,
    categorySlug: 'fashion-men',
    sku: 'SM-VS',
    attributes: { size: 'M/L/XL', color: 'Noir' },
    tags: ['fashion', 'men', 'tutorial'],
  },
  {
    storeIndex: 1,
    title: 'Ensemble Kids Joy',
    description: 'Tenue coton pour enfant.',
    price: '4990',
    stockQty: 26,
    categorySlug: 'fashion-kids',
    sku: 'SM-KD',
    attributes: { size: '4-10', color: 'Rose' },
    tags: ['fashion', 'kids', 'tutorial'],
  },
  {
    storeIndex: 1,
    title: 'Creme Hydratante Glow',
    description: 'Hydratation 24h, peau douce.',
    price: '3890',
    stockQty: 35,
    categorySlug: 'skincare',
    sku: 'SM-CR',
    attributes: { size: '50ml' },
    tags: ['beauty', 'skincare', 'tutorial'],
  },
];

function imageUrl(seed: string, size = 800) {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${size}/${size}`;
}

async function ensureCategories() {
  const count = await prisma.category.count();
  if (count > 0) return;
  for (const [parentIndex, category] of categorySeedData.entries()) {
    const parent = await prisma.category.create({
      data: {
        slug: category.slug,
        nameFr: category.nameFr,
        nameAr: category.nameAr,
        sortOrder: parentIndex,
        isActive: true,
      },
    });
    for (const [childIndex, child] of category.children.entries()) {
      await prisma.category.create({
        data: {
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
}

async function getCategoryId(slug: string, cache: Map<string, string>) {
  const key = slug.toLowerCase();
  if (cache.has(key)) return cache.get(key)!;
  const found = await prisma.category.findFirst({ where: { slug } });
  if (found) {
    cache.set(key, found.id);
    return found.id;
  }
  const created = await prisma.category.create({
    data: { slug, nameFr: slug, nameAr: slug, sortOrder: 0, isActive: true },
  });
  cache.set(key, created.id);
  return created.id;
}

async function ensureUser(params: { email: string; name: string; roles: Role[]; phone?: string; address?: string; passwordHash: string }) {
  const existing = await prisma.user.findUnique({ where: { email: params.email } });
  if (!existing) {
    return prisma.user.create({
      data: {
        email: params.email,
        passwordHash: params.passwordHash,
        name: params.name,
        roles: params.roles,
        phone: params.phone,
        address: params.address,
      },
    });
  }
  const roles = Array.from(new Set([...existing.roles, ...params.roles]));
  return prisma.user.update({
    where: { id: existing.id },
    data: {
      name: params.name,
      roles: { set: roles },
      phone: params.phone ?? existing.phone,
      address: params.address ?? existing.address,
    },
  });
}

async function ensureStore(ownerId: string, data: { name: string; description?: string; location?: string; logoUrl?: string; bannerUrl?: string; isVerified?: boolean }) {
  const existing = await prisma.store.findFirst({ where: { ownerId, name: data.name } });
  if (existing) return existing;
  return prisma.store.create({
    data: {
      ownerId,
      name: data.name,
      description: data.description,
      location: data.location,
      logoUrl: data.logoUrl,
      bannerUrl: data.bannerUrl,
      isVerified: data.isVerified ?? false,
    },
  });
}

async function ensureCourierProfile(userId: string, name: string) {
  await prisma.courierProfile.upsert({
    where: { userId },
    update: {
      vehicleType: 'MOTO',
      phone: '+213600000000',
      displayName: name,
      status: 'AVAILABLE',
      currentLat: 36.7538,
      currentLng: 3.0588,
      lastLocationAt: new Date(),
    },
    create: {
      userId,
      vehicleType: 'MOTO',
      phone: '+213600000000',
      displayName: name,
      status: 'AVAILABLE',
      currentLat: 36.7538,
      currentLng: 3.0588,
      lastLocationAt: new Date(),
    },
  });
}

async function main() {
  await ensureCategories();
  const categories = await prisma.category.findMany();
  const categoryCache = new Map(categories.map((c) => [c.slug.toLowerCase(), c.id]));
  const passwordHash = await bcrypt.hash(demoPassword, 10);

  const admin = await ensureUser({
    email: 'admin@souqly.local',
    name: 'Admin Souqly',
    roles: [Role.ADMIN, Role.BUYER],
    passwordHash,
  });

  const buyer = await ensureUser({
    email: 'buyer@souqly.local',
    name: 'Nora Buyer',
    roles: [Role.BUYER],
    phone: '+213550000001',
    address: 'Alger Centre',
    passwordHash,
  });

  const courier = await ensureUser({
    email: 'courier@souqly.local',
    name: 'Yanis Courier',
    roles: [Role.COURIER, Role.BUYER],
    phone: '+213550000002',
    address: 'Alger',
    passwordHash,
  });
  await ensureCourierProfile(courier.id, courier.name);

  const storesByIndex: string[] = [];
  for (const seed of storeSeeds) {
    const seller = await ensureUser({
      email: seed.email,
      name: seed.name,
      roles: [Role.SELLER, Role.BUYER],
      phone: '+213550000003',
      address: seed.store.location,
      passwordHash,
    });
    const store = await ensureStore(seller.id, seed.store);
    storesByIndex.push(store.id);
  }

  let createdProducts = 0;
  let createdListings = 0;

  for (const product of productSeeds) {
    const storeId = storesByIndex[product.storeIndex];
    if (!storeId) continue;
    const existing = await prisma.product.findFirst({
      where: { storeId, title: product.title },
    });
    const categoryId = await getCategoryId(product.categorySlug, categoryCache);
    const item =
      existing ||
      (await prisma.product.create({
        data: {
          storeId,
          categoryId,
          status: ProductStatus.ACTIVE,
          title: product.title,
          description: product.description,
          price: product.price,
          stockQty: product.stockQty,
          sku: product.sku,
          attributes: product.attributes,
        },
      }));
    if (!existing) createdProducts += 1;

    const imagesCount = await prisma.productImage.count({ where: { productId: item.id } });
    if (imagesCount === 0) {
      const slug = product.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      await prisma.productImage.createMany({
        data: [
          {
            productId: item.id,
            urlMain: imageUrl(`tutorial-${slug}-1`, 800),
            urlThumb: imageUrl(`tutorial-${slug}-1`, 400),
            url: imageUrl(`tutorial-${slug}-1`, 800),
            sortOrder: 0,
          },
          {
            productId: item.id,
            urlMain: imageUrl(`tutorial-${slug}-2`, 800),
            urlThumb: imageUrl(`tutorial-${slug}-2`, 400),
            url: imageUrl(`tutorial-${slug}-2`, 800),
            sortOrder: 1,
          },
        ],
      });
    }

    const listingExists = await prisma.listing.findFirst({ where: { productId: item.id } });
    if (!listingExists) {
      await prisma.listing.create({
        data: {
          productId: item.id,
          storeId,
          status: ListingStatus.ACTIVE,
          tags: product.tags,
        },
      });
      createdListings += 1;
    }
  }

  // Create one demo order + delivery
  const storeId = storesByIndex[0];
  const listing = storeId
    ? await prisma.listing.findFirst({ where: { storeId, status: ListingStatus.ACTIVE }, include: { product: true } })
    : null;
  if (listing) {
    const existingOrder = await prisma.order.findFirst({
      where: { userId: buyer.id, notes: 'TUTORIAL_FLOW' },
    });
    if (!existingOrder) {
      const order = await prisma.order.create({
        data: {
          userId: buyer.id,
          status: OrderStatus.PENDING,
          totalAmount: listing.product.price,
          currency: listing.product.currency,
          address: buyer.address ?? 'Alger Centre',
          phone: buyer.phone ?? '+213550000001',
          notes: 'TUTORIAL_FLOW',
          items: {
            create: [
              {
                productId: listing.product.id,
                qty: 1,
                unitPrice: listing.product.price,
              },
            ],
          },
        },
      });

      await prisma.delivery.create({
        data: {
          orderId: order.id,
          storeId: listing.storeId,
          buyerId: buyer.id,
          courierId: courier.id,
          status: DeliveryStatus.ASSIGNED,
          assignedAt: new Date(),
          pickupAddress: { text: 'Souqly Tech - Alger' },
          dropoffAddress: { text: order.address },
          pickupLat: 36.7538,
          pickupLng: 3.0588,
          dropoffLat: 36.7529,
          dropoffLng: 3.0420,
          notes: 'TUTORIAL_FLOW',
        },
      });
    }
  }

  console.log(`Tutorial seed done. Users: 5, products added: ${createdProducts}, listings added: ${createdListings}.`);
  console.log(`Password for all tutorial accounts: ${demoPassword}`);
  console.log(`Admin: admin@souqly.local | Buyer: buyer@souqly.local | Sellers: seller1@souqly.local, seller2@souqly.local | Courier: courier@souqly.local`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
