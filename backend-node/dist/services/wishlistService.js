"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listWishlist = exports.removeFromWishlist = exports.addToWishlist = void 0;
const zod_1 = require("zod");
const client_1 = require("../prisma/client");
const serializer_1 = require("../utils/serializer");
const wishlistInputSchema = zod_1.z.object({
    userId: zod_1.z.number().int().positive(),
    productId: zod_1.z.number().int().positive(),
});
const addToWishlist = async (input) => {
    const data = wishlistInputSchema.parse(input);
    const item = await client_1.prisma.wishlistItem.upsert({
        where: {
            userId_productId: {
                userId: data.userId,
                productId: data.productId,
            },
        },
        create: {
            userId: data.userId,
            productId: data.productId,
        },
        update: {},
        include: {
            product: {
                include: {
                    images: { orderBy: { sortOrder: "asc" } },
                },
            },
        },
    });
    return (0, serializer_1.toPlainObject)({
        ...item,
        product: {
            ...item.product,
            image_urls: item.product.images.map((image) => image.url),
        },
    });
};
exports.addToWishlist = addToWishlist;
const removeFromWishlist = async (input) => {
    const data = wishlistInputSchema.parse(input);
    await client_1.prisma.wishlistItem.delete({
        where: {
            userId_productId: {
                userId: data.userId,
                productId: data.productId,
            },
        },
    });
};
exports.removeFromWishlist = removeFromWishlist;
const listWishlist = async (userId) => {
    const items = await client_1.prisma.wishlistItem.findMany({
        where: { userId },
        include: {
            product: {
                include: {
                    images: { orderBy: { sortOrder: "asc" } },
                },
            },
        },
    });
    return items.map((item) => (0, serializer_1.toPlainObject)({
        ...item,
        product: {
            ...item.product,
            image_urls: item.product.images.map((image) => image.url),
        },
    }));
};
exports.listWishlist = listWishlist;
//# sourceMappingURL=wishlistService.js.map