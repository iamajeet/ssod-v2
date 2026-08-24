import type { Route } from "./+types/$";
import { authenticate } from "../../shopify.server";

export async function loader({ request }: Route.LoaderArgs) {
  await authenticate.admin(request);
  return null;
}

export default function Auth() {
  return null;
}
