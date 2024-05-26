import { Context, Schema, Service, Session } from 'koishi'
import { } from 'koishi-plugin-markdown-to-image-service'
import {toSendMarkdown } from './method'
import { QQ_Buttons } from './type'

export const name = 'send-markdown'

export const inject = {
  required: ['markdownToImage']
}

export interface Config { }

export const Config: Schema<Config> = Schema.object({})

export interface markdownMessage {
  title?: string
  content: string
  image?: {
      width: number
      height: number
      url: string
  }
}

declare module 'koishi' {
  interface Context {
    sendMarkdown: sendMarkdownServer
  }

}

class sendMarkdownServer extends Service {
  constructor(ctx: Context) {
    super(ctx, 'sendMarkdown', true)
  }
  async send(session: Session, markdown: string,buttons?:QQ_Buttons,eventId = null,command?: string) {
    await toSendMarkdown(this.ctx,markdown,session,buttons=null,eventId = null, command)
  }
}

export function apply(ctx: Context) {
  ctx.plugin(sendMarkdownServer)

  ctx.command('sendmd [markdown:text]', '发送markdown消息').action(async ({ session }, markdown) => {
    await ctx.sendMarkdown.send(session, markdown)
  })
}
