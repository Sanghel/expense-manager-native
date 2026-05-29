// insforge/functions/ai-categorize-purchase/index.ts
//
// Edge function que toma el texto libre del usuario + el listado de categorías
// y devuelve una transacción estructurada usando Claude haiku-4-5.
//
// Replica el comportamiento de `lib/actions/ai.actions.ts` del proyecto web.
// La diferencia es que el web usa `@anthropic-ai/sdk`; aquí en Deno usamos
// `fetch` directo a la API de Anthropic — el SDK funciona pero pesa más y
// no necesitamos features avanzados.
//
// Auth: requiere usuario logueado (Bearer token en header). No usamos el
// userId para nada hoy, pero la auth previene abuso de la API key.

interface IncomingBody {
  text: string
  categories: { id: string; name: string; type: string }[]
}

interface CategorizedTransaction {
  amount: number
  description: string
  category_id: string
  type: 'income' | 'expense'
  currency: 'COP' | 'USD' | 'VES'
  date: string
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

function buildPrompt(text: string, categories: IncomingBody['categories']): string {
  const today = new Date().toISOString().split('T')[0]
  const catLines = categories
    .map((c) => `- ID: ${c.id} | Nombre: ${c.name} | Tipo: ${c.type}`)
    .join('\n')

  return `El usuario escribió: "${text}"

Categorías disponibles:
${catLines}

Fecha actual: ${today}

Responde ÚNICAMENTE con un JSON válido (sin markdown, sin explicaciones).

Si el mensaje describe un gasto o ingreso, responde:
{
  "valid": true,
  "amount": <número positivo>,
  "description": "<descripción breve y clara del gasto/ingreso>",
  "category_id": "<id de la categoría más apropiada del listado>",
  "type": "<'income' o 'expense'>",
  "currency": "<'COP', 'USD' o 'VES' - detecta según el contexto: 'dólares'/'USD'/'$' → USD, 'bolívares'/'VES'/'Bs' → VES, por defecto COP>",
  "date": "<fecha en formato YYYY-MM-DD - 'ayer' → día anterior, 'la semana pasada' → lunes anterior, si no se menciona usa la fecha actual>"
}

Si el mensaje NO describe un gasto ni un ingreso, responde:
{
  "valid": false,
  "message": "<mensaje breve y amigable explicando que solo puedes registrar transacciones>"
}`
}

export default async function (req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }
  if (req.method !== 'POST') {
    return json(405, { success: false, error: 'Método no permitido' })
  }

  // Auth gate: requerimos Bearer token. No validamos contra la BD aquí —
  // confiamos en que InsForge solo enruta requests con token válido. Si quieres
  // user-scoped lógica, descomenta el bloque de getCurrentUser más abajo.
  const authHeader = req.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return json(401, { success: false, error: 'Auth requerida' })
  }

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) {
    return json(500, { success: false, error: 'Falta ANTHROPIC_API_KEY en server' })
  }

  let body: IncomingBody
  try {
    body = await req.json()
  } catch {
    return json(400, { success: false, error: 'JSON inválido en request body' })
  }

  if (!body.text || typeof body.text !== 'string') {
    return json(400, { success: false, error: 'Falta `text`' })
  }
  if (!Array.isArray(body.categories)) {
    return json(400, { success: false, error: 'Falta `categories`' })
  }

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 500,
        messages: [{ role: 'user', content: buildPrompt(body.text, body.categories) }],
      }),
    })

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text()
      console.error('Anthropic error', anthropicRes.status, errText)
      return json(502, { success: false, error: `Anthropic ${anthropicRes.status}` })
    }

    const data = await anthropicRes.json() as {
      content: { type: string; text: string }[]
    }
    const textBlock = data.content?.find((b) => b.type === 'text')
    if (!textBlock) {
      return json(502, { success: false, error: 'No se recibió respuesta del modelo' })
    }

    const clean = textBlock.text
      .trim()
      .replace(/^```(?:json)?\n?/, '')
      .replace(/\n?```$/, '')

    let parsed: CategorizedTransaction & { valid: boolean; message?: string }
    try {
      parsed = JSON.parse(clean)
    } catch {
      return json(502, { success: false, error: 'El modelo no devolvió un JSON válido' })
    }

    if (!parsed.valid) {
      return json(200, {
        success: false,
        error:
          parsed.message ?? 'Solo puedo ayudarte a registrar gastos e ingresos.',
      })
    }

    return json(200, { success: true, data: parsed })
  } catch (err) {
    console.error('ai-categorize-purchase error', err)
    return json(500, { success: false, error: 'Error al procesar con IA' })
  }
}
