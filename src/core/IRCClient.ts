import { IRCSocket, IMessage } from "./IRCSocket";
import { EventEmitter } from "events";
import { EReplies, getReplyName } from "./EReplies";


export const MESSAGE = Symbol("MESSAGE");
export const STATUS_UPDATE = Symbol("STATUS_UPDATE");
export const DEFAULT_TARGET = "DEFAULT_TARGET";

export interface IEvent {
    text: string;
    channel?: string; // Which channel to target?
    notice?: boolean; // Should it appear everywhere?
}

export interface IStatus {
    connected: boolean;
    host: string;
    nick: string;
}

export interface IChannel {
    name: string;
    names: string[];
}

type Channels = { [key: string]: IChannel }

export class IRCClient extends EventEmitter {
    ircSocket: IRCSocket;
    status: IStatus;
    channels: Channels;
    target: string;

    constructor(nick: string) {
        super();
        this.ircSocket = new IRCSocket();

        this.status = {
            connected: false,
            host: "",
            nick: ""
        }

        this.channels = {};

        this.target = DEFAULT_TARGET; // TODO: check if this is a valid channel name? I think not.

        this.ircSocket.on("message", this.handleMessage.bind(this));
    }

    // The client needs to handle some messages, channel join/quit etc
    handleMessage(message: IMessage) {
        const parsedCommand = parseInt(message.command);
        if (isNaN(parsedCommand)) {
            // If our command is not a number...
            switch (message.command) {
                case "NOTICE":
                    this.emitMessage(`{yellow-fg}{bold}!!!{/} ${message.trailing}`);
                    break;
                case "PRIVMSG":
                    const from = message.prefix.split("!")[0];
                    this.emitMessage(`<${from}> ${message.trailing}`);
                    break;
                case "JOIN":
                    break;
                case "QUIT":
                    break;
                case "PART":
                    break;
                case "MODE":
                    break;
                default:
                    break;
            }
        }
        else {
            switch (parsedCommand as EReplies) {
                case EReplies.RPL_MOTDSTART:
                case EReplies.RPL_MOTD:
                case EReplies.RPL_ENDOFMOTD:
                    this.emitMessage(`{green-fg}!{/} ${message.trailing}`);
                    break;
                default:
                    this.emitMessage(`${getReplyName(parsedCommand)} ${message.trailing}`);
                    break;
            }
        }
    }

    emitMessage(text: string, channel?: string, notice?: boolean) {
        const event: IEvent = {
            text,
            channel,
            notice
        }

        this.emit(MESSAGE, event);
    }

    emitStatus() {
        this.emit(STATUS_UPDATE, this.status);
    }

    _socketSend(message: string, params?: string) {
        this.emitMessage(`{magenta-fg}DEBUG > ${message} ${params}{/}`);
        this.ircSocket.send(message, params);
    }

    // Try to send a message to the active channel/user
    connect(host: string, port = 6667) {
        this.status.host = host;
        return this.ircSocket.connect(host, port).then(() => {
            this.status.connected = true;
        });
    }

    nickname(nick: string) {
        this._socketSend(`NICK ${nick}`);
    }

    user(username: string, realname: string) {
        this._socketSend(`USER ${username} 0 * ${realname}`);
    }

    join(channel: string) {
        this._socketSend(`JOIN ${channel}`);

        // add to channels
    }

    part(channel: string) {
        this._socketSend(`PART ${channel}`);

        // remove from channels
    }

    quit() {
        this._socketSend("QUIT");
    }

    identify(username: string, password: string) {
        this._socketSend("PRIVMSG NickServ", `identify ${username} ${password}`);
    }

    privmsg(message: string, target = this.target) {
        this._socketSend(`PRIVMSG ${target}`, message);
    }

    changeTarget() {

    }
}