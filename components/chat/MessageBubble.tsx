// components/chat/MessageBubble.tsx
//
// Render de un mensaje del chat. Hay dos roles:
//  - user: burbuja alineada a la derecha, fondo primary
//  - assistant: burbuja alineada a la izquierda, fondo surface
//
// El contenido es solo texto plano. Los previews de transacción los
// renderiza un componente aparte (TransactionPreview).
import { View, Text } from 'react-native'

export type MessageRole = 'user' | 'assistant'

interface Props {
  role: MessageRole
  text: string
}

export function MessageBubble({ role, text }: Props) {
  const isUser = role === 'user'
  return (
    <View
      className={`mx-4 my-1 ${isUser ? 'items-end' : 'items-start'}`}
    >
      <View
        className={`max-w-[85%] px-4 py-2.5 rounded-2xl ${
          isUser ? 'bg-primary' : 'bg-surface border border-border'
        }`}
      >
        <Text
          className={`${isUser ? 'text-white' : 'text-white'} text-sm leading-5`}
        >
          {text}
        </Text>
      </View>
    </View>
  )
}
