import { ListingStatus, PrismaClient, Role, ProductStatus, OrderStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { categorySeedData } from './categories.data';

const prisma = new PrismaClient();

const demoPassword = process.env.DEMO_SELLER_PASSWORD || 'Seller123!';

const storeSeeds = [
  {
    email: 'seller1@demo.local',
    name: 'Amine',
    store: {
      name: 'Atlas Tech',
      description: 'Electronique fiable et moderne pour tous les jours.',
      location: 'Alger, DZ',
      logoUrl: imageUrl('atlas-tech-logo'),
      bannerUrl: imageUrl('atlas-tech-banner', 1200),
      isVerified: true,
    },
  },
  {
    email: 'seller2@demo.local',
    name: 'Sara',
    store: {
      name: 'Sahara Style',
      description: 'Mode urbaine et pieces elegantes, inspiration saharienne.',
      location: 'Oran, DZ',
      logoUrl: imageUrl('sahara-style-logo'),
      bannerUrl: imageUrl('sahara-style-banner', 1200),
      isVerified: false,
    },
  },
  {
    email: 'seller3@demo.local',
    name: 'Yacine',
    store: {
      name: 'Kabyle Home',
      description: 'Maison chaleureuse, artisanat et deco authentique.',
      location: 'Tizi Ouzou, DZ',
      logoUrl: imageUrl('kabyle-home-logo'),
      bannerUrl: imageUrl('kabyle-home-banner', 1200),
      isVerified: true,
    },
  },
  {
    email: 'seller4@demo.local',
    name: 'Lina',
    store: {
      name: 'Aurora Beauty',
      description: 'Soin, makeup et cheveux avec des formules douces.',
      location: 'Blida, DZ',
      logoUrl: imageUrl('aurora-beauty-logo'),
      bannerUrl: imageUrl('aurora-beauty-banner', 1200),
      isVerified: false,
    },
  },
  {
    email: 'seller5@demo.local',
    name: 'Bilal',
    store: {
      name: 'Nomad Sports',
      description: 'Equipements sport, outdoor et fitness pour aventuriers.',
      location: 'Constantine, DZ',
      logoUrl: imageUrl('nomad-sports-logo'),
      bannerUrl: imageUrl('nomad-sports-banner', 1200),
      isVerified: true,
    },
  },
  {
    email: 'seller6@demo.local',
    name: 'Ines',
    store: {
      name: 'Dunes Gadgets',
      description: 'Gadgets malins et tech compacte pour la vie active.',
      location: 'Setif, DZ',
      logoUrl: imageUrl('dunes-gadgets-logo'),
      bannerUrl: imageUrl('dunes-gadgets-banner', 1200),
      isVerified: false,
    },
  },
  {
    email: 'seller7@demo.local',
    name: 'Riad',
    store: {
      name: 'Casbah Crafts',
      description: 'Artisanat local, bois, metal et pieces uniques.',
      location: 'Annaba, DZ',
      logoUrl: imageUrl('casbah-crafts-logo'),
      bannerUrl: imageUrl('casbah-crafts-banner', 1200),
      isVerified: false,
    },
  },
  {
    email: 'seller8@demo.local',
    name: 'Meriem',
    store: {
      name: 'Medina Kids',
      description: 'Collection kids confortable, durable et coloree.',
      location: 'Bejaia, DZ',
      logoUrl: imageUrl('medina-kids-logo'),
      bannerUrl: imageUrl('medina-kids-banner', 1200),
      isVerified: true,
    },
  },
  {
    email: 'seller9@demo.local',
    name: 'Samir',
    store: {
      name: 'Oran Audio',
      description: 'Audio premium, casques et enceintes performantes.',
      location: 'Oran, DZ',
      logoUrl: imageUrl('oran-audio-logo'),
      bannerUrl: imageUrl('oran-audio-banner', 1200),
      isVerified: true,
    },
  },
  {
    email: 'seller10@demo.local',
    name: 'Nour',
    store: {
      name: 'Blida Kitchen',
      description: 'Cuisine pratique et appareils solides pour la maison.',
      location: 'Blida, DZ',
      logoUrl: imageUrl('blida-kitchen-logo'),
      bannerUrl: imageUrl('blida-kitchen-banner', 1200),
      isVerified: false,
    },
  },
];

const productSeeds = [
  {
    storeIndex: 0,
    title: 'Smartphone Atlas A1',
    description: 'Ecran 6.5", 128GB, batterie 5000mAh.',
    price: '59990',
    stockQty: 30,
    categorySlug: 'phones',
    sku: 'AT-A1',
    attributes: { color: 'Noir', ram: '6GB', storage: '128GB' },
    tags: ['electronics', 'phones', 'demo-seed'],
  },
  {
    storeIndex: 0,
    title: 'Laptop Atlas L5',
    description: '14" FHD, i5, 8GB RAM, SSD 512GB.',
    price: '149900',
    stockQty: 12,
    categorySlug: 'computers',
    sku: 'AT-L5',
    attributes: { color: 'Gris', cpu: 'i5', storage: '512GB SSD' },
    tags: ['electronics', 'laptop', 'demo-seed'],
  },
  {
    storeIndex: 0,
    title: 'Wireless Earbuds A-Pods',
    description: 'Autonomie 24h avec boitier, reduction de bruit.',
    price: '8990',
    stockQty: 40,
    categorySlug: 'audio',
    sku: 'AT-APODS',
    attributes: { color: 'Blanc', battery: '24h' },
    tags: ['audio', 'earbuds', 'demo-seed'],
  },
  {
    storeIndex: 1,
    title: 'Veste Sahara',
    description: 'Veste legere coupe moderne, parfaite mi-saison.',
    price: '6990',
    stockQty: 25,
    categorySlug: 'fashion-men',
    sku: 'SS-VST',
    attributes: { color: 'Beige', size: 'M/L/XL' },
    tags: ['fashion', 'men', 'demo-seed'],
  },
  {
    storeIndex: 1,
    title: 'Robe Oasis',
    description: 'Robe fluide style ete, tissu doux.',
    price: '7990',
    stockQty: 18,
    categorySlug: 'fashion-women',
    sku: 'SS-ROB',
    attributes: { color: 'Vert', size: 'S/M/L' },
    tags: ['fashion', 'women', 'demo-seed'],
  },
  {
    storeIndex: 1,
    title: 'Sneakers Desert Run',
    description: 'Confort longue distance, semelle amortissante.',
    price: '10990',
    stockQty: 22,
    categorySlug: 'fashion-men',
    sku: 'SS-SNK',
    attributes: { color: 'Noir', size: '40-45' },
    tags: ['fashion', 'sneakers', 'demo-seed'],
  },
  {
    storeIndex: 2,
    title: 'Tapis Kabyle',
    description: 'Tissage traditionnel, motifs authentiques.',
    price: '12990',
    stockQty: 8,
    categorySlug: 'decor',
    sku: 'KH-TAP',
    attributes: { size: '160x230', material: 'Laine' },
    tags: ['home', 'decor', 'demo-seed'],
  },
  {
    storeIndex: 2,
    title: 'Table Beldi',
    description: 'Table en bois massif, finition artisanale.',
    price: '24900',
    stockQty: 6,
    categorySlug: 'furniture',
    sku: 'KH-TBL',
    attributes: { material: 'Bois', shape: 'Rectangulaire' },
    tags: ['home', 'furniture', 'demo-seed'],
  },
  {
    storeIndex: 2,
    title: 'Set Cuisine Olive',
    description: 'Set cuisine 12 pieces, acier inox.',
    price: '9990',
    stockQty: 15,
    categorySlug: 'kitchen',
    sku: 'KH-SET',
    attributes: { pieces: 12, material: 'Inox' },
    tags: ['home', 'kitchen', 'demo-seed'],
  },
  {
    storeIndex: 3,
    title: 'Creme Eclat',
    description: 'Hydratation 24h, peau lumineuse.',
    price: '4590',
    stockQty: 40,
    categorySlug: 'skincare',
    sku: 'AB-CR',
    attributes: { skin: 'Tous types', size: '50ml' },
    tags: ['beauty', 'skincare', 'demo-seed'],
  },
  {
    storeIndex: 3,
    title: 'Palette Lumiere',
    description: 'Palette 12 couleurs, tenue longue.',
    price: '5290',
    stockQty: 28,
    categorySlug: 'makeup',
    sku: 'AB-PL',
    attributes: { shades: 12, finish: 'Mat/Glowy' },
    tags: ['beauty', 'makeup', 'demo-seed'],
  },
  {
    storeIndex: 3,
    title: 'Shampoo Silk',
    description: 'Cheveux doux, protection UV.',
    price: '2890',
    stockQty: 35,
    categorySlug: 'haircare',
    sku: 'AB-SH',
    attributes: { size: '400ml', type: 'Normal' },
    tags: ['beauty', 'hair', 'demo-seed'],
  },
  {
    storeIndex: 4,
    title: 'Tapis Yoga Nomad',
    description: 'Tapis antiderapant, 6mm.',
    price: '2990',
    stockQty: 50,
    categorySlug: 'fitness',
    sku: 'NS-YG',
    attributes: { thickness: '6mm', color: 'Bleu' },
    tags: ['sports', 'fitness', 'demo-seed'],
  },
  {
    storeIndex: 4,
    title: 'Velo Trek 26',
    description: 'VTT 26", freins a disque.',
    price: '32900',
    stockQty: 9,
    categorySlug: 'cycling',
    sku: 'NS-VT',
    attributes: { frame: 'Alu', speed: '21' },
    tags: ['sports', 'cycling', 'demo-seed'],
  },
  {
    storeIndex: 4,
    title: 'Sac Outdoor Pro',
    description: 'Sac 35L, waterproof.',
    price: '5990',
    stockQty: 20,
    categorySlug: 'outdoor',
    sku: 'NS-SAC',
    attributes: { capacity: '35L', material: 'Nylon' },
    tags: ['sports', 'outdoor', 'demo-seed'],
  },
  {
    storeIndex: 5,
    title: 'Smartwatch Dune S2',
    description: 'Ecran AMOLED, suivi sport.',
    price: '11990',
    stockQty: 18,
    categorySlug: 'phones',
    sku: 'DG-SW',
    attributes: { color: 'Noir', battery: '7 jours' },
    tags: ['electronics', 'wearables', 'demo-seed'],
  },
  {
    storeIndex: 5,
    title: 'Mini Drone D1',
    description: 'Drone compact, camera HD.',
    price: '18990',
    stockQty: 10,
    categorySlug: 'computers',
    sku: 'DG-DR1',
    attributes: { camera: 'HD', range: '120m' },
    tags: ['electronics', 'drone', 'demo-seed'],
  },
  {
    storeIndex: 5,
    title: 'Camera Action D-View',
    description: '4K, etanche 10m.',
    price: '15990',
    stockQty: 12,
    categorySlug: 'audio',
    sku: 'DG-CAM',
    attributes: { resolution: '4K', waterproof: '10m' },
    tags: ['electronics', 'camera', 'demo-seed'],
  },
  {
    storeIndex: 6,
    title: 'Lampe Artisanale',
    description: 'Lampe metal & verre, style casbah.',
    price: '8990',
    stockQty: 14,
    categorySlug: 'decor',
    sku: 'CC-LAMP',
    attributes: { material: 'Metal', color: 'Or' },
    tags: ['home', 'decor', 'demo-seed'],
  },
  {
    storeIndex: 6,
    title: 'Chaise Bois',
    description: 'Chaise robuste en bois massif.',
    price: '7490',
    stockQty: 16,
    categorySlug: 'furniture',
    sku: 'CC-CH',
    attributes: { material: 'Bois', color: 'Noyer' },
    tags: ['home', 'furniture', 'demo-seed'],
  },
  {
    storeIndex: 6,
    title: 'Plateau Cuivre',
    description: 'Plateau decoratif, finition martelage.',
    price: '4590',
    stockQty: 20,
    categorySlug: 'kitchen',
    sku: 'CC-PLT',
    attributes: { material: 'Cuivre', diameter: '38cm' },
    tags: ['home', 'kitchen', 'demo-seed'],
  },
  {
    storeIndex: 7,
    title: 'Ensemble Kids Joy',
    description: 'Ensemble confortable coton.',
    price: '4990',
    stockQty: 30,
    categorySlug: 'fashion-kids',
    sku: 'MK-ENS',
    attributes: { size: '4-10', color: 'Rose' },
    tags: ['fashion', 'kids', 'demo-seed'],
  },
  {
    storeIndex: 7,
    title: 'Chaussures Mini Run',
    description: 'Chaussures legeres pour enfants.',
    price: '3990',
    stockQty: 24,
    categorySlug: 'fashion-kids',
    sku: 'MK-SHO',
    attributes: { size: '28-35', color: 'Bleu' },
    tags: ['fashion', 'kids', 'demo-seed'],
  },
  {
    storeIndex: 7,
    title: 'Sac Ecole Color',
    description: 'Sac ecole durable, multicolore.',
    price: '3590',
    stockQty: 18,
    categorySlug: 'fashion-kids',
    sku: 'MK-BAG',
    attributes: { capacity: '15L', color: 'Mix' },
    tags: ['fashion', 'kids', 'demo-seed'],
  },
  {
    storeIndex: 8,
    title: 'Casque Studio OX',
    description: 'Casque pro, isolation sonore.',
    price: '17990',
    stockQty: 14,
    categorySlug: 'audio',
    sku: 'OA-OX',
    attributes: { impedance: '32ohm', color: 'Noir' },
    tags: ['audio', 'headphones', 'demo-seed'],
  },
  {
    storeIndex: 8,
    title: 'Enceinte Nomade Wave',
    description: 'Enceinte bluetooth, autonomie 12h.',
    price: '6990',
    stockQty: 26,
    categorySlug: 'audio',
    sku: 'OA-WAV',
    attributes: { battery: '12h', water: 'IPX5' },
    tags: ['audio', 'speaker', 'demo-seed'],
  },
  {
    storeIndex: 8,
    title: 'Micro USB Stream',
    description: 'Micro cardioide pour streaming.',
    price: '7990',
    stockQty: 11,
    categorySlug: 'audio',
    sku: 'OA-MIC',
    attributes: { pattern: 'Cardioide', connection: 'USB' },
    tags: ['audio', 'micro', 'demo-seed'],
  },
  {
    storeIndex: 9,
    title: 'Robot Cuisine B-500',
    description: 'Robot 10 fonctions, bol 5L.',
    price: '29990',
    stockQty: 7,
    categorySlug: 'kitchen',
    sku: 'BK-RB',
    attributes: { capacity: '5L', power: '1000W' },
    tags: ['home', 'kitchen', 'demo-seed'],
  },
  {
    storeIndex: 9,
    title: 'Couteaux Chef Set',
    description: 'Set 6 couteaux acier inox.',
    price: '6990',
    stockQty: 20,
    categorySlug: 'kitchen',
    sku: 'BK-KIT',
    attributes: { pieces: 6, material: 'Inox' },
    tags: ['home', 'kitchen', 'demo-seed'],
  },
  {
    storeIndex: 9,
    title: 'Machine Cafe Aroma',
    description: 'Cafetiere 1.5L, programmable.',
    price: '8990',
    stockQty: 13,
    categorySlug: 'kitchen',
    sku: 'BK-CAF',
    attributes: { capacity: '1.5L', program: 'Auto' },
    tags: ['home', 'kitchen', 'demo-seed'],
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

async function ensureSeller(email: string, name: string, passwordHash: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    return prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        roles: [Role.SELLER, Role.BUYER],
      },
    });
  }
  if (!existing.roles.includes(Role.SELLER)) {
    const roles = Array.from(new Set([...existing.roles, Role.SELLER]));
    return prisma.user.update({
      where: { id: existing.id },
      data: { roles: { set: roles } },
    });
  }
  return existing;
}

async function ensureBuyer(email: string, name: string, passwordHash: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    return prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        roles: [Role.BUYER],
      },
    });
  }
  if (!existing.roles.includes(Role.BUYER)) {
    const roles = Array.from(new Set([...existing.roles, Role.BUYER]));
    return prisma.user.update({
      where: { id: existing.id },
      data: { roles: { set: roles } },
    });
  }
  return existing;
}

async function ensureCourier(email: string, name: string, passwordHash: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  const user =
    existing ||
    (await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        roles: [Role.COURIER, Role.BUYER],
      },
    }));

  const roles = new Set(user.roles);
  roles.add(Role.COURIER);
  roles.add(Role.BUYER);
  if (roles.size !== user.roles.length) {
    await prisma.user.update({
      where: { id: user.id },
      data: { roles: { set: Array.from(roles) } },
    });
  }

  await prisma.courierProfile.upsert({
    where: { userId: user.id },
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
      userId: user.id,
      vehicleType: 'MOTO',
      phone: '+213600000000',
      displayName: name,
      status: 'AVAILABLE',
      currentLat: 36.7538,
      currentLng: 3.0588,
      lastLocationAt: new Date(),
    },
  });

  return user;
}

async function main() {
  await ensureCategories();
  const categories = await prisma.category.findMany();
  const categoryCache = new Map(categories.map((c) => [c.slug.toLowerCase(), c.id]));
  const passwordHash = await bcrypt.hash(demoPassword, 10);

  const storesByIndex: string[] = [];

  for (const seed of storeSeeds) {
    const seller = await ensureSeller(seed.email, seed.name, passwordHash);
    const existingStore = await prisma.store.findFirst({
      where: { ownerId: seller.id, name: seed.store.name },
    });
    const store =
      existingStore ||
      (await prisma.store.create({
        data: {
          ownerId: seller.id,
          name: seed.store.name,
          description: seed.store.description,
          location: seed.store.location,
          logoUrl: seed.store.logoUrl,
          bannerUrl: seed.store.bannerUrl,
          isVerified: seed.store.isVerified,
        },
      }));
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
            urlMain: imageUrl(`product-${slug}-1`, 800),
            urlThumb: imageUrl(`product-${slug}-1`, 400),
            url: imageUrl(`product-${slug}-1`, 800),
            sortOrder: 0,
          },
          {
            productId: item.id,
            urlMain: imageUrl(`product-${slug}-2`, 800),
            urlThumb: imageUrl(`product-${slug}-2`, 400),
            url: imageUrl(`product-${slug}-2`, 800),
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

  const buyer = await ensureBuyer('buyer@demo.local', 'Buyer Demo', passwordHash);
  const courier = await ensureCourier('courier@demo.local', 'Courier Demo', passwordHash);
  const storeId = storesByIndex[0];
  const store = storeId ? await prisma.store.findUnique({ where: { id: storeId } }) : null;
  const listing = storeId
    ? await prisma.listing.findFirst({
        where: { storeId, status: ListingStatus.ACTIVE },
        include: { product: true },
      })
    : null;

  if (store && listing) {
    const existingOrder = await prisma.order.findFirst({
      where: { userId: buyer.id, notes: 'DEMO_FLOW' },
    });
    if (existingOrder) {
      console.log('Demo delivery flow already seeded.');
    } else {
      const order = await prisma.order.create({
        data: {
          userId: buyer.id,
          status: OrderStatus.PENDING,
          totalAmount: listing.product.price,
          currency: listing.product.currency,
          address: 'Alger Centre',
          notes: 'DEMO_FLOW',
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

      const delivery = await prisma.delivery.create({
        data: {
          orderId: order.id,
          storeId: store.id,
          buyerId: buyer.id,
          pickupAddress: { text: store.location },
          dropoffAddress: { text: order.address },
          pickupLat: 36.7538,
          pickupLng: 3.0588,
          dropoffLat: 36.7529,
          dropoffLng: 3.0420,
          notes: 'DEMO_FLOW',
        },
      });

      // Delivery created; seller can now request a courier from the app.
    }
  }

  console.log(`Demo seed done. Stores: ${storeSeeds.length}, products added: ${createdProducts}, listings added: ${createdListings}.`);
  console.log(`Seller password (all demo sellers): ${demoPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

