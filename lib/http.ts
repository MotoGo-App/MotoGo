import { z } from "zod";
import { NextResponse } from "next/server";

export type Ok<T> = {
    ok: true;
    data: T;
};

export type Err = {
    ok: false;
    response: NextResponse;
};

export const validateBody = async <T extends z.ZodTypeAny>(
    req: Request,
    schema: T,
): Promise<Ok<z.infer<T>> | Err> => {
    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return {
            ok: false,
            response: NextResponse.json(
                { message: "JSON inválido" },
                { status: 400 },
            ),
        };
    }

    const result = schema.safeParse(body);
    if (!result.success) {
        const errors = result.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
        }));
        return {
            ok: false,
            response: NextResponse.json(
                { message: "Datos inválidos", errors },
                { status: 400 },
            ),
        };
    }

    return { ok: true, data: result.data };
};
