import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();
// Les clubs de padel reellement ouverts a Kenitra.
const KENITRA_CLUBS = [
    'Lyautey Social Club',
    'CMK : Centre Multisport Kénitra',
    'Elite Padel Club Kenitra',
];
async function main() {
    const email = (process.env.ADMIN_EMAIL ?? 'admin@padelteammates.com').toLowerCase();
    const password = process.env.ADMIN_PASSWORD ?? 'ChangeMe123!';
    const name = process.env.ADMIN_NAME ?? 'Admin Kenitra';
    const passwordHash = await bcrypt.hash(password, 10);
    const admin = await prisma.user.upsert({
        where: { email },
        update: { role: 'ADMIN' },
        create: { email, name, passwordHash, role: 'ADMIN', profilePublic: true },
    });
    console.log(`Admin pret: ${admin.email}`);
    for (const clubName of KENITRA_CLUBS) {
        const club = await prisma.club.upsert({
            where: { name_city: { name: clubName, city: 'Kénitra' } },
            update: {},
            create: { name: clubName, city: 'Kénitra' },
        });
        console.log(`Club pret: ${club.name} (${club.city})`);
    }
}
main()
    .then(() => prisma.$disconnect())
    .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
});
//# sourceMappingURL=seed.js.map