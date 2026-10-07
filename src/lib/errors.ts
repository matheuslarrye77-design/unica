export class ActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ActionError";
  }
}

export async function runAction<T>(fn: () => Promise<T> | T): Promise<T | { ok: false; error: string }> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof ActionError) return { ok: false, error: error.message };
    if (typeof error === "object" && error && "digest" in error) throw error;
    console.error(error);
    return { ok: false, error: "Não foi possível concluir. Tente novamente." };
  }
}
