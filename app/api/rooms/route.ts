import { createRoom, readPayload, responseError } from "../../../lib/room-store";
import { validateName } from "../../../lib/game";
export async function POST(request:Request) {
  try {const payload=await readPayload(request);return Response.json(await createRoom(validateName(payload.name)),{status:201,headers:{"Cache-Control":"no-store"}});}
  catch(error) {return responseError(error);}
}
