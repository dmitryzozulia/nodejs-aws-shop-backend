import { handler } from "../lib/lambda/getProductById";
import { createAPIGatewayProxyEvent } from "./utils/test-helpers";

describe("getProductsById Lambda", () => {
  test("should return product when valid ID is provided", async () => {
    const event = createAPIGatewayProxyEvent({
      productId: "7567ec4b-b10c-48c5-9345-fc73c48a80aa",
    });
    const result = await handler(event);
    const body = JSON.parse(result.body);

    //expect(result.statusCode).toBe(200);
    expect(body).toEqual({
      description: "Short Product Description1",
      id: "7567ec4b-b10c-48c5-9345-fc73c48a80aa",
      price: 24,
      title: "ProductOne",
    });
  });
});
