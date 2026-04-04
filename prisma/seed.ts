import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

async function main() {
  // Categories
  const starters = await prisma.category.create({
    data: { name: "Starters", sortOrder: 1 },
  });
  const mains = await prisma.category.create({
    data: { name: "Main Course", sortOrder: 2 },
  });
  const drinks = await prisma.category.create({
    data: { name: "Drinks", sortOrder: 3 },
  });
  const desserts = await prisma.category.create({
    data: { name: "Desserts", sortOrder: 4 },
  });

  // Menu Items
  await prisma.menuItem.createMany({
    data: [
      { name: "Paneer Tikka", description: "Marinated cottage cheese grilled to perfection", price: 180, categoryId: starters.id },
      { name: "Chicken 65", description: "Spicy deep-fried chicken", price: 200, categoryId: starters.id },
      { name: "Veg Spring Roll", description: "Crispy rolls stuffed with fresh vegetables", price: 150, categoryId: starters.id },
      { name: "Fish Fingers", description: "Crispy battered fish fingers", price: 220, categoryId: starters.id },
      { name: "Butter Chicken", description: "Rich creamy tomato-based chicken curry", price: 280, categoryId: mains.id },
      { name: "Paneer Butter Masala", description: "Cottage cheese in rich butter gravy", price: 240, categoryId: mains.id },
      { name: "Chicken Biryani", description: "Aromatic basmati rice with spiced chicken", price: 260, categoryId: mains.id },
      { name: "Dal Makhani", description: "Creamy black lentils slow cooked overnight", price: 190, categoryId: mains.id },
      { name: "Veg Fried Rice", description: "Wok-tossed rice with fresh vegetables", price: 160, categoryId: mains.id },
      { name: "Fish Curry", description: "Fresh fish in tangy coconut curry", price: 300, categoryId: mains.id },
      { name: "Coke", description: "300ml", price: 40, categoryId: drinks.id },
      { name: "Fresh Lime Soda", description: "Sweet or salt", price: 60, categoryId: drinks.id },
      { name: "Mango Lassi", description: "Thick yogurt drink with mango", price: 80, categoryId: drinks.id },
      { name: "Masala Chai", description: "Traditional Indian tea", price: 30, categoryId: drinks.id },
      { name: "Gulab Jamun", description: "Soft fried dumplings in sugar syrup (2 pcs)", price: 80, categoryId: desserts.id },
      { name: "Rasmalai", description: "Soft cottage cheese balls in sweet milk", price: 100, categoryId: desserts.id },
      { name: "Kulfi", description: "Traditional Indian ice cream", price: 70, categoryId: desserts.id },
    ],
  });

  // Tables
  await prisma.table.createMany({
    data: [
      { number: 1, capacity: 2 },
      { number: 2, capacity: 2 },
      { number: 3, capacity: 4 },
      { number: 4, capacity: 4 },
      { number: 5, capacity: 6 },
      { number: 6, capacity: 8 },
    ],
  });

  console.log("Seed data created successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
