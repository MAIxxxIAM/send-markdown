import { Context, Dict, Session } from "koishi"
import { Telegram } from '@koishijs/plugin-adapter-telegram'
import { markdownMessage } from '.'
import yaml from 'js-yaml'
import fs from 'fs'
import { resolve } from 'path'
import imageSize from 'image-size'

export const md_ky = yaml.load(fs.readFileSync(resolve(__dirname,'../markdown.yaml'), 'utf8'))
function splitText(text: string, textLength: number, md = true): string[] {
    text = text.replace(/\*\*/g, '')
    text = text.replace(/^# /g, '\n')
    text = text.replace(/# /g, '\n')
    text = text.replace(/^> /g, '\n')
    text = text.replace(/> /g, '\n')
    text = text.replace(/^- /g, '\n')
    text = text.replace(/- /g, '\n')
    text = text.replace(/\`\`\`/g, '\n')
    text = text.replace(/\\/g, '')
    text = text.replace(/\*/g, '')
    text = text.replace(/---/g, '\n')
  
    let parts = text.split(/[,，.。？！!；~\n]/).filter(part => part.replace(/\s/g, '') !== '')
    if (!md) {
      return parts
    }
    let idealLength = text.length / textLength
  
    let result: string[] = []
    let currentPart = parts[0]
  
    for (let i = 1; i < parts.length; i++) {
      if (currentPart.length + parts[i].length < idealLength) {
        currentPart += parts[i]
      } else {
        result.push(currentPart)
        currentPart = parts[i]
      }
    }
  
    if (currentPart?.length > 0) {
      result.push(currentPart)
    }
    return result
  }
  
  export function toKeyMarkdown(markdownMessage: markdownMessage, command?: string) {
    const mdModel = command ? (md_ky?.[command] ? md_ky?.[command] : md_ky.markdown) : md_ky.markdown
    //config配置对象转为数组
    const mdText = splitText(markdownMessage.content, mdModel.text.length)
    const keys = mdModel.text
    let data = keys.map((key, index) => {
      return {
        key: key,
        values: [mdText[index]]
      }
    }).filter(item => item.values[0] !== undefined && item.values[0] !== "")
  
    if (mdModel?.title) {
      if(markdownMessage?.title){data = data.concat({
        key: mdModel.title,
        values:splitText(markdownMessage.title,1)
      })}
    }
    if (markdownMessage?.image) {
      if (mdModel?.img) {
  
        data = data.concat([
          {
            key: mdModel.img.size,
            values: [`img #${markdownMessage.image.width}px #${markdownMessage.image.height}px`]
          },
          {
            key: mdModel.img.url,
            values: [markdownMessage.image.url]
          },
        ])
      }
    }
    return data
  }
  

  export function getMarkdownParams(markdown: string) {
    markdown = markdown.replace(/[\n\r]/g, '\\r')
    markdown = markdown.replace(/"/g, '\\"')
    try {
      markdown = JSON.parse(`"${markdown}"`)
    } catch (error) {
      return '解析失败'
    }
    markdown = markdown.replace(/\n/g, '\r')
    markdown = markdown.replace(/^# /g, '#§ ')
    markdown = markdown.replace(/^> /g, '>§ ')
    markdown = markdown.replace(/^- /g, '-§ ')
    markdown = markdown.replace(/^(\d)\. /g, '$1§. ')
    markdown = markdown.replace(/(\[.*?\])(\s?\(.*?\))/g, '$1§$2')
    markdown = markdown.replace(/(\[.*?\])(\s?\[.*?\])/g, '$1§$2')
    markdown = markdown.replace(/(<[^@].*?)>/g, '$1§>')
    markdown = markdown.replace(/```/g, '`§``')
    markdown = markdown.replace(/---/g, '-§--')
    markdown = markdown.replace(/_([^§]+?)(?=_)/g, '_$1§')
    markdown = markdown.replace(/\*([^§]+?)(?=\*)/g, '*$1§')
    markdown = markdown.replace(/`([^§]+?)(?=`)/g, '`$1§')
    const params = markdown.split('§')
    return Array(100).fill(null).map((_, index) => ({ key: `text${index + 1}`, values: [params[index] ?? ' '] }))
  }
  export async function toSendMarkdown(ctx: Context, a: string, session: Session, button = null, eventId = null, command?: string) {
    const mdModel = command ? (md_ky?.[command] ? md_ky?.[command] : md_ky.markdown) : md_ky.markdown
    const b = getMarkdownParams(a)
    let outUrlMarkdown = a
      .replace(`<@${session.userId}>`, '你的')
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '')
      .replace(/\|\|/g, '')
      .replace(/([#*_~()\[\]`#+\-={}|{}.!])/g, '\\$1')
      .replace(/(.)(>)/g, '$1\\$2')
    const { platform } = session
    const md = a.replace(`<@${session.userId}>`, '你')
    let c: any
    switch (platform) {
      case 'qq':
      case 'qqguild':
        try {
          c = await session.bot.internal.sendMessage(session.channelId, Object.assign({
            content: "111",
            msg_type: 2,
            markdown: {
              custom_template_id: '102072441_1711377105',
              params: b
            },
            timestamp: session.timestamp,
            msg_seq: Math.floor(Math.random() * 1000000),
          }, platform == 'qq' ? button : null, eventId ? { event_id: eventId } : { msg_id: session.messageId, }))
        } catch {
          let buttons = button ? button.keyboard.content.rows.map(row => row.buttons) : []
          buttons = buttons.flat()
          let canUse='»'
          const buttonName = buttons.map(button => { if (button.action.type == 2) { return `${button.action.data}➣${button.render_data.label}` } }).filter(a => a!==undefined)
            for(let i=0;i<buttonName.length;i++){
              if((i+1)%3==0&&i!=buttonName.length-1){
                canUse+=buttonName[i]+'\n»'
            }else{
              canUse+=buttonName[i]+(i==buttonName.length-1?'':'||')
            }
          }
          const url = a.match(/https?:\/\/[^\s]+/g)
          const img_size = a.match(/\!\[(.*?) #(\d+)px #(\d+)px\]/)
          let onepic=true
          if(a.match(/```([^`]+)```/s)){
            if(a.match(/```([^`]+)```/s)[0]?.split('\n')?.filter(part => part.replace(/```/g, '') !== '')?.length>5)
            {onepic=false}
          }
          if ((url.length == 1)&&onepic) {
            a.replace(`<@${session.userId}>`, '你的')
            const tittle = outUrlMarkdown.split('\n')[0]
            const Markdown = outUrlMarkdown.split('\n')
            Markdown.shift()
            outUrlMarkdown = Markdown.join('\n')
            const kvMarkdown: markdownMessage = {
              title: tittle,
              content: outUrlMarkdown,
              image: {
                width: Number(img_size[2]),
                height: Number(img_size[3]),
                url: url[0].replace(/\)/g, '')
              }
            }
            const data = toKeyMarkdown(kvMarkdown)
            try {
              c = await session.bot.internal.sendMessage(session.channelId, Object.assign({
                content: "111",
                msg_type: 2,
                markdown: {
                  custom_template_id: mdModel.id,
                  params: data
                },
                timestamp: session.timestamp,
                msg_seq: Math.floor(Math.random() * 1000000),
              }, platform == 'qq' ? button : null, eventId ? { event_id: eventId } : { msg_id: session.messageId, }))
            } catch {
              const content = splitText(outUrlMarkdown, mdModel.text.length, false)
              c = await session.send(<message>
                <img src={url[0].replace(/\)/g, '')} />
                {content.join('\n')+'\n'+buttonName.join('\n')}
              </message>)
            }
          } else {
            const tittle = outUrlMarkdown.split('\n')[0]
            const d = await ctx.markdownToImage.convertToImage(md)
            const size = imageSize(d)
            const imgSrc = await toUrl(ctx, session, d)
            const kvMarkdown: markdownMessage = {
              title:tittle,
              content: '',
              image: {
                width: size.width,
                height: size.height,
                url: imgSrc
              }
            }
            const data = toKeyMarkdown(kvMarkdown)
            console.log(data)
            try {
              c = await session.bot.internal.sendMessage(session.channelId, Object.assign({
                content: "111",
                msg_type: 2,
                markdown: {
                  custom_template_id: mdModel.id,
                  params: data
                },
                timestamp: session.timestamp,
                msg_seq: Math.floor(Math.random() * 1000000),
              }, platform == 'qq' ? button : null, eventId ? { event_id: eventId } : { msg_id: session.messageId, }))
            } catch(e) {
              console.log(e)
              c = await session.send(<message>
                <img src={imgSrc} />
              </message>)
            }
          }
        }
        break
  
      //telegram兼容
      case 'telegram':
        const url = a.match(/https?:\/\/[^\s]+/g)
        const urlText = outUrlMarkdown.split('\n')[0]
        const Markdown = outUrlMarkdown.split('\n')
        Markdown.shift()
        outUrlMarkdown = Markdown.filter(a => a.replace(/\s/g, '') != '').join('\n')
        let buttons = button ? button.keyboard.content.rows.map(row => row.buttons) : []
        buttons = buttons.flat()
        const buttonName: Telegram.InlineKeyboardButton[][] = [];
        let temp = [];
  
        buttons.forEach((button, index) => {
          if (button.action.type == 2) {
            const buttonElement = (<button id={button.id} type='input' text={button.action.data} theme='primary'>{button.render_data.label}</button>);
            temp.push(decodeButton(buttonElement.attrs, button.render_data.label))
  
            // 当 temp 数组中有两个元素时，将它们作为一个子数组推入结果数组中，并清空 temp 数组
            if (temp.length === 3) {
              buttonName.push(temp)
              temp = []
            }
          }
        })
  
        // 如果在循环结束后 temp 数组中还有元素，将它们作为一个子数组推入结果数组中
        if (temp.length > 0) {
          buttonName.push(temp);
        }
        try {
  
          c = await session['telegram'].sendMessage({
            chat_id: session.channelId,
            text: (url ? `[${urlText}](${(url[0]).replace(/\)/g, '')})\n\n` : '') + outUrlMarkdown,
            parse_mode: 'MarkdownV2',
            reply_markup: {
              inline_keyboard: buttonName
            }
          })
        } catch (e) {
          console.log(e)
        }
      //     c=await session.send(<message>
      //       {transform(outUrlMarkdown)}
      //       {buttonName}
      //     </message>)
    }
    return c
  }
  
  export async function toUrl(ctx, session, img) {

    if (ctx.get('server.temp')?.upload) {
      const url = await ctx.get('server.temp').upload(img)
      return url.replace(/_/g, "%5F")
    }
    const { url } = await ctx.get('server.temp').create(img)
    return url 
  }

  function decodeButton(attrs: Dict, label: string): Telegram.InlineKeyboardButton {
    if (attrs.type === 'link') {
      return {
        text: label,
        url: attrs.href,
      }
    } else if (attrs.type === 'input') {
      return {
        text: label,
        switch_inline_query_current_chat: attrs.text,
      }
    } else {
      return {
        text: label,
        callback_data: attrs.id,
      }
    }
  }
  