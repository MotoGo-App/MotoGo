import { describe, it, expect } from "vitest";
import { z } from "zod";
import { validateBody } from "@/lib/http";

const testSchema = z.object({
    name: z.string().min(1),
    age: z.number().int().min(0),
});

const makeRequest = (body: string | object): Request => {
    const payload = typeof body === "string" ? body : JSON.stringify(body);
    return new Request("http://localhost/api/test", {
        method: "POST",
        body: payload,
        headers: { "Content-Type": "application/json" },
    });
};

describe("validateBody", () => {
    describe("success path", () => {
        it("returns ok:true with parsed data when input matches the schema", async () => {
            const req = makeRequest({ name: "Ana", age: 30 });

            const result = await validateBody(req, testSchema);

            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.data).toEqual({ name: "Ana", age: 30 });
            }
        });

        it("strips unknown fields that are not declared in the schema", async () => {
            const req = makeRequest({ name: "Ana", age: 30, extra: "ignored" });

            const result = await validateBody(req, testSchema);

            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.data).not.toHaveProperty("extra");
            }
        });
    });

    describe("malformed JSON", () => {
        it("returns a 400 with 'JSON inválido' when the body is not valid JSON", async () => {
            const req = makeRequest("not valid json{");

            const result = await validateBody(req, testSchema);

            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.response.status).toBe(400);
                const body = await result.response.json();
                expect(body).toEqual({ message: "JSON inválido" });
            }
        });
    });

    describe("schema validation failure", () => {
        it("returns a 400 with 'Datos inválidos' and an errors array", async () => {
            const req = makeRequest({ name: "", age: -1 });

            const result = await validateBody(req, testSchema);

            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.response.status).toBe(400);
                const body = await result.response.json();
                expect(body.message).toBe("Datos inválidos");
                expect(Array.isArray(body.errors)).toBe(true);
                expect(body.errors.length).toBeGreaterThan(0);
            }
        });

        it("each error has a path and a message", async () => {
            const req = makeRequest({ name: "", age: "not a number" });

            const result = await validateBody(req, testSchema);

            expect(result.ok).toBe(false);
            if (!result.ok) {
                const body = await result.response.json();
                for (const err of body.errors) {
                    expect(typeof err.path).toBe("string");
                    expect(typeof err.message).toBe("string");
                }
            }
        });

        it("surfaces every invalid field, not just the first", async () => {
            const req = makeRequest({ name: "", age: -5 });

            const result = await validateBody(req, testSchema);

            expect(result.ok).toBe(false);
            if (!result.ok) {
                const body = await result.response.json();
                const paths = body.errors.map((e: { path: string }) => e.path);
                expect(paths).toContain("name");
                expect(paths).toContain("age");
            }
        });

        it("dot-joins nested paths so the frontend can map to form fields", async () => {
            const nestedSchema = z.object({
                user: z.object({
                    email: z.string().email(),
                }),
            });
            const req = makeRequest({ user: { email: "not-an-email" } });

            const result = await validateBody(req, nestedSchema);

            expect(result.ok).toBe(false);
            if (!result.ok) {
                const body = await result.response.json();
                expect(body.errors[0].path).toBe("user.email");
            }
        });

        it("reports missing required fields", async () => {
            const req = makeRequest({ age: 30 });

            const result = await validateBody(req, testSchema);

            expect(result.ok).toBe(false);
            if (!result.ok) {
                const body = await result.response.json();
                const paths = body.errors.map((e: { path: string }) => e.path);
                expect(paths).toContain("name");
            }
        });

        it("does not coerce string booleans (strict boolean)", async () => {
            const boolSchema = z.object({ flag: z.boolean() });
            const req = makeRequest({ flag: "true" });

            const result = await validateBody(req, boolSchema);

            expect(result.ok).toBe(false);
            if (!result.ok) {
                const body = await result.response.json();
                expect(body.errors[0].path).toBe("flag");
            }
        });
    });
});
