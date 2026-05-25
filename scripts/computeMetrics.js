const { PrismaClient } = require('@prisma/client');

async function main(){
  const prisma = new PrismaClient();
  try{
    const inv = await prisma.inventoryItem.findMany({ include: { product: true, warehouse: true } });
    const reservations = await prisma.reservation.findMany({});

    const totalUnits = inv.reduce((s,i) => s + i.totalUnits, 0);
    const reservedUnits = inv.reduce((s,i) => s + i.reservedUnits, 0);
    const availableUnits = totalUnits - reservedUnits;
    const totalReservations = reservations.length;
    const confirmed = reservations.filter(r => r.status === 'CONFIRMED').length;
    const expired = reservations.filter(r => r.status === 'EXPIRED').length;
    const released = reservations.filter(r => r.status === 'RELEASED').length;

    console.log('METRICS:', JSON.stringify({ totalUnits, reservedUnits, availableUnits, totalReservations, confirmed, expired, released }, null, 2));
    console.log('\nINVENTORY ITEMS:');
    for (const i of inv) {
      console.log(`${i.product.name} @ ${i.warehouse.name} -> total=${i.totalUnits} reserved=${i.reservedUnits}`);
    }

    console.log('\nRESERVATIONS:');
    for (const r of reservations) {
      console.log(`${r.id} product=${r.productId} warehouse=${r.warehouseId} qty=${r.quantity} status=${r.status}`);
    }
  }catch(e){
    console.error('Error querying DB:', e);
    process.exitCode = 1;
  }finally{
    await prisma.$disconnect();
  }
}

main();
