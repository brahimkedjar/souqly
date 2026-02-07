import { FeedService } from './feed.service';

describe('FeedService ranking', () => {
  it('prioritizes followed stores and affinity', () => {
    const service = new FeedService({} as any);
    const now = new Date('2026-02-06T00:00:00Z');

    const listings = [
      {
        id: 'listing-1',
        storeId: 'store-1',
        productId: 'product-1',
        createdAt: new Date('2026-02-04T00:00:00Z'),
        product: { categoryId: 'cat-1' },
      },
      {
        id: 'listing-2',
        storeId: 'store-2',
        productId: 'product-2',
        createdAt: new Date('2026-02-05T00:00:00Z'),
        product: { categoryId: 'cat-2' },
      },
    ];

    const scored = service.rankListings(listings as any, {
      followedStoreIds: new Set(['store-1']),
      categoryAffinity: new Map([['cat-1', 1]]),
      popularityMap: new Map([
        ['listing-1', 1],
        ['listing-2', 10],
      ]),
      maxPopularity: 10,
      now,
      seenSet: new Set(),
      storeRatingMap: new Map(),
      storeReportMap: new Map(),
      listingReportMap: new Map(),
    });

    expect(scored[0].listing.id).toBe('listing-1');
  });

  it('diversifies stores in top results', () => {
    const service = new FeedService({} as any);
    const scored = [
      { listing: { id: 'a1', storeId: 's1', product: {} }, score: 10 },
      { listing: { id: 'a2', storeId: 's1', product: {} }, score: 9 },
      { listing: { id: 'b1', storeId: 's2', product: {} }, score: 8 },
      { listing: { id: 'c1', storeId: 's3', product: {} }, score: 7 },
    ];

    const result = service.diversifyListings(scored as any, 3);
    const storeIds = result.map((item) => item.listing.storeId);

    expect(storeIds.filter((id) => id === 's1').length).toBe(1);
  });

  it('downranks seen listings', () => {
    const service = new FeedService({} as any);
    const now = new Date('2026-02-06T00:00:00Z');

    const listings = [
      {
        id: 'listing-1',
        storeId: 'store-1',
        productId: 'product-1',
        createdAt: new Date('2026-02-04T00:00:00Z'),
        product: { categoryId: 'cat-1' },
      },
      {
        id: 'listing-2',
        storeId: 'store-2',
        productId: 'product-2',
        createdAt: new Date('2026-02-04T00:00:00Z'),
        product: { categoryId: 'cat-1' },
      },
    ];

    const scored = service.rankListings(listings as any, {
      followedStoreIds: new Set(),
      categoryAffinity: new Map(),
      popularityMap: new Map([
        ['listing-1', 1],
        ['listing-2', 1],
      ]),
      maxPopularity: 1,
      now,
      seenSet: new Set(['listing-1']),
      storeRatingMap: new Map(),
      storeReportMap: new Map(),
      listingReportMap: new Map(),
    });

    expect(scored[0].listing.id).toBe('listing-2');
  });
});
