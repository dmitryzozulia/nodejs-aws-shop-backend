import { handler } from "../lib/lambda/getProductsList";

interface Product {
  description: string;
  id: string;
  price: number;
  title: string;
}

describe("getProductsList Lambda", () => {
  test("should return all products with correct structure", async () => {
    // Act
    const result = await handler();
    const body = JSON.parse(result.body) as Product[];

    // Assert
    expect(result.statusCode).toBe(200);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);

    // Check structure of each product
    body.forEach((product: Product) => {
      expect(product).toMatchObject({
        description: expect.any(String),
        id: expect.any(String),
        price: expect.any(Number),
        title: expect.any(String),
      });
    });

    // Check if specific product exists
    expect(body).toContainEqual(
      expect.objectContaining({
        description: expect.any(String),
        id: "7567ec4b-b10c-48c5-9345-fc73c48a80aa",
        price: expect.any(Number),
        title: expect.any(String),
      })
    );
  });

  test("should have correct CORS headers", async () => {
    // Act
    const result = await handler();

    // Assert
    expect(result.headers).toEqual({
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Credentials": true,
      "Access-Control-Allow-Methods": "GET",
    });
  });

  test("should return products with correct data types", async () => {
    // Act
    const result = await handler();
    const body = JSON.parse(result.body) as Product[];

    // Assert
    body.forEach((product: Product) => {
      expect(typeof product.description).toBe("string");
      expect(typeof product.id).toBe("string");
      expect(typeof product.price).toBe("number");
      expect(typeof product.title).toBe("string");

      // Additional validations
      expect(product.price).toBeGreaterThan(0);
      expect(product.id).not.toBe("");
      expect(product.title).not.toBe("");
      expect(product.description).not.toBe("");
    });
  });

  test("should return non-empty product list", async () => {
    // Act
    const result = await handler();
    const body = JSON.parse(result.body) as Product[];

    // Assert
    expect(body.length).toBeGreaterThan(0);
    expect(body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          description: expect.any(String),
          id: expect.any(String),
          price: expect.any(Number),
          title: expect.any(String),
        }),
      ])
    );
  });

  test("should return valid JSON response", async () => {
    // Act
    const result = await handler();

    // Assert
    expect(() => {
      const parsed = JSON.parse(result.body) as Product[];
      expect(parsed).toBeDefined();
    }).not.toThrow();
  });

  test("should not return products with negative prices", async () => {
    // Act
    const result = await handler();
    const body = JSON.parse(result.body) as Product[];

    // Assert
    body.forEach((product: Product) => {
      expect(product.price).toBeGreaterThanOrEqual(0);
    });
  });

  test("should not return products with missing required fields", async () => {
    // Act
    const result = await handler();
    const body = JSON.parse(result.body) as Product[];

    // Assert
    body.forEach((product: Product) => {
      expect(product).toHaveProperty("description");
      expect(product).toHaveProperty("id");
      expect(product).toHaveProperty("price");
      expect(product).toHaveProperty("title");
    });
  });

  test("should return products with valid price format", async () => {
    // Act
    const result = await handler();
    const body = JSON.parse(result.body) as Product[];

    // Assert
    body.forEach((product: Product) => {
      expect(Number.isFinite(product.price)).toBe(true);
      expect(Number.isInteger(product.price * 100)).toBe(true); // Checks if price has max 2 decimal places
    });
  });
});
