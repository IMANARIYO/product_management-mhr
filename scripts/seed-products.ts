import { db } from '../src/index';
import { products, users } from '../src/db/schema';
import { eq } from 'drizzle-orm';

const productSeeds = [
  // BEERS
  { name: 'Mutzig Beer', type: 'BEER', size: '650ml', buyingPrice: '800', sellingPrice: '1200', currentStock: 50, image: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400' },
  { name: 'Primus Beer', type: 'BEER', size: '650ml', buyingPrice: '750', sellingPrice: '1100', currentStock: 45, image: 'https://images.unsplash.com/photo-1618885472179-5e474019f2a9?w=400' },
  { name: 'Amstel Beer', type: 'BEER', size: '500ml', buyingPrice: '900', sellingPrice: '1300', currentStock: 30, image: 'https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=400' },
  { name: 'Heineken Beer', type: 'BEER', size: '500ml', buyingPrice: '1000', sellingPrice: '1500', currentStock: 25, image: 'https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=400' },
  { name: 'Turbo King', type: 'BEER', size: '500ml', buyingPrice: '600', sellingPrice: '900', currentStock: 60, image: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=400' },
  { name: 'Skol Beer', type: 'BEER', size: '650ml', buyingPrice: '700', sellingPrice: '1000', currentStock: 40, image: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400' },
  { name: 'Castle Lite', type: 'BEER', size: '500ml', buyingPrice: '850', sellingPrice: '1250', currentStock: 35, image: 'https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=400' },
  { name: 'Guinness Stout', type: 'BEER', size: '500ml', buyingPrice: '1200', sellingPrice: '1800', currentStock: 20, image: 'https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=400' },

  // SODAS
  { name: 'Coca Cola', type: 'SODA', size: '500ml', buyingPrice: '400', sellingPrice: '600', currentStock: 80, image: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=400' },
  { name: 'Pepsi Cola', type: 'SODA', size: '500ml', buyingPrice: '380', sellingPrice: '580', currentStock: 70, image: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=400' },
  { name: 'Fanta Orange', type: 'SODA', size: '500ml', buyingPrice: '350', sellingPrice: '550', currentStock: 65, image: 'https://images.unsplash.com/photo-1624552184280-8a4b3229e3d4?w=400' },
  { name: 'Sprite', type: 'SODA', size: '500ml', buyingPrice: '350', sellingPrice: '550', currentStock: 60, image: 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=400' },
  { name: 'Mountain Dew', type: 'SODA', size: '500ml', buyingPrice: '400', sellingPrice: '600', currentStock: 45, image: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=400' },
  { name: 'Mirinda', type: 'SODA', size: '500ml', buyingPrice: '320', sellingPrice: '500', currentStock: 55, image: 'https://images.unsplash.com/photo-1624552184280-8a4b3229e3d4?w=400' },
  { name: '7UP', type: 'SODA', size: '500ml', buyingPrice: '350', sellingPrice: '550', currentStock: 50, image: 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=400' },
  { name: 'Tonic Water', type: 'SODA', size: '500ml', buyingPrice: '450', sellingPrice: '700', currentStock: 30, image: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=400' },

  // WINES
  { name: 'Red Wine Merlot', type: 'WINE', size: '750ml', buyingPrice: '5000', sellingPrice: '8000', currentStock: 15, image: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=400' },
  { name: 'White Wine Chardonnay', type: 'WINE', size: '750ml', buyingPrice: '4500', sellingPrice: '7500', currentStock: 12, image: 'https://images.unsplash.com/photo-1547595628-c61a29f496f0?w=400' },
  { name: 'Rosé Wine', type: 'WINE', size: '750ml', buyingPrice: '4000', sellingPrice: '6500', currentStock: 10, image: 'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=400' },
  { name: 'Cabernet Sauvignon', type: 'WINE', size: '750ml', buyingPrice: '6000', sellingPrice: '9500', currentStock: 8, image: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=400' },
  { name: 'Pinot Grigio', type: 'WINE', size: '750ml', buyingPrice: '5500', sellingPrice: '8500', currentStock: 6, image: 'https://images.unsplash.com/photo-1547595628-c61a29f496f0?w=400' },
  { name: 'Champagne', type: 'WINE', size: '750ml', buyingPrice: '8000', sellingPrice: '12000', currentStock: 5, image: 'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=400' },

  // SPIRITS
  { name: 'Johnnie Walker Red', type: 'SPIRIT', size: '750ml', buyingPrice: '15000', sellingPrice: '25000', currentStock: 8, image: 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=400' },
  { name: 'Smirnoff Vodka', type: 'SPIRIT', size: '750ml', buyingPrice: '12000', sellingPrice: '20000', currentStock: 10, image: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=400' },
  { name: 'Bacardi Rum', type: 'SPIRIT', size: '750ml', buyingPrice: '13000', sellingPrice: '22000', currentStock: 7, image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400' },
  { name: 'Jack Daniels', type: 'SPIRIT', size: '750ml', buyingPrice: '18000', sellingPrice: '30000', currentStock: 5, image: 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=400' },
  { name: 'Grey Goose Vodka', type: 'SPIRIT', size: '750ml', buyingPrice: '20000', sellingPrice: '35000', currentStock: 3, image: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=400' },
  { name: 'Hennessy Cognac', type: 'SPIRIT', size: '750ml', buyingPrice: '25000', sellingPrice: '40000', currentStock: 4, image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400' },
  { name: 'Tequila Silver', type: 'SPIRIT', size: '750ml', buyingPrice: '14000', sellingPrice: '23000', currentStock: 6, image: 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=400' },
  { name: 'Gin Bombay', type: 'SPIRIT', size: '750ml', buyingPrice: '16000', sellingPrice: '26000', currentStock: 5, image: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=400' },
] as const;

async function seedProducts() {
  try {
    console.log('Seeding products...');
    
    // Get admin user to use as creator
    const [adminUser] = await db.select().from(users).where(eq(users.role, 'ADMIN')).limit(1);
    
    if (!adminUser) {
      console.error('No admin user found. Please run setup first.');
      return;
    }

    // Insert all products
    for (const product of productSeeds) {
      await db.insert(products).values({
        ...product,
        createdBy: adminUser.id,
      }).onConflictDoNothing();
    }
    
    console.log(`Successfully seeded ${productSeeds.length} products!`);
    
  } catch (error) {
    console.error('Product seeding failed:', error);
  }
  
  process.exit(0);
}

seedProducts();