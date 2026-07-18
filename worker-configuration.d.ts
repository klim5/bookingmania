interface PagesFunction<Env = unknown> {
  (context: {
    request: Request
    env: Env
    params: Record<string, string | string[]>
  }): Response | Promise<Response>
}
