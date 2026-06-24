/**
 * Patch node-routeros untuk kompatibilitas RouterOS 7.x:
 * - `!empty` saat query tidak menemukan data
 * - `UNREGISTEREDTAG` saat respons datang setelah channel sudah ditutup
 */
let patched = false;

interface ChannelLike {
  trapped: boolean;
  data: unknown[];
  emit: (event: string, ...args: unknown[]) => void;
  close: () => void;
}

interface ReceiverLike {
  tags: Map<string, { name: string; callback: (packet: string[]) => void }>;
  currentPacket: string[];
  cleanUp: () => void;
}

function patchEmptyReply(): void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require("node-routeros/dist/Channel") as {
    Channel: {
      prototype: {
        processPacket: (packet: string[]) => void;
      };
    };
  };

  const { Channel } = mod;
  const original = Channel.prototype.processPacket;

  Channel.prototype.processPacket = function (this: ChannelLike, packet: string[]) {
    const reply = packet[0];
    if (reply === "!empty") {
      if (!this.trapped) this.emit("done", this.data);
      this.close();
      return;
    }
    return original.call(this, packet);
  };
}

function patchUnregisteredTag(): void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require("node-routeros/dist/connector/Receiver") as {
    Receiver: {
      prototype: {
        sendTagData: (currentTag: string) => void;
      };
    };
  };

  const { Receiver } = mod;
  const original = Receiver.prototype.sendTagData;

  Receiver.prototype.sendTagData = function (this: ReceiverLike, currentTag: string) {
    if (!this.tags.get(currentTag)) {
      // Respons telat setelah !done — abaikan agar tidak uncaughtException.
      this.cleanUp();
      return;
    }
    return original.call(this, currentTag);
  };
}

export function ensureLegacyApiEmptyReplyPatch(): void {
  if (patched) return;
  patched = true;

  try {
    patchEmptyReply();
  } catch {
    /* struktur modul berubah — abaikan */
  }

  try {
    patchUnregisteredTag();
  } catch {
    /* struktur modul berubah — abaikan */
  }
}
