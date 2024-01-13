const MAGIC = [ 0x56, 0x53, 0x43, 0x01, 0x00 ]; // "VSC.."

export class VSBFile {
  buffer;
  offset = 0;

  notes = [];

  static fromBuffer(buffer) {
    const file = new VSBFile();
    file.buffer = new Uint8Array(buffer);
    file.read();

    return file;
  }

  u32() {
    this.offset += 4;
    return new Uint32Array((new Uint8Array([ this.buffer[this.offset - 4 + 3], this.buffer[this.offset - 4 + 2], this.buffer[this.offset - 4 + 1], this.buffer[this.offset - 4] ])).buffer, 0, 1)[0];
  }

  u16() {
    this.offset += 2;
    return new Uint16Array((new Uint8Array([ this.buffer[this.offset - 2 + 1], this.buffer[this.offset - 2] ])).buffer, 0, 1)[0];
  }

  u8() {
    this.offset++;
    return this.buffer[this.offset - 1];
  }

  verify(got, expected, msg) {
    if (got !== expected) throw new Error(`Mismatched ${msg}: got 0x${got.toString(16)}, expected 0x${expected.toString(16)}`);
  }

  verifyU8(expected, msg) {
    this.verify(this.u8(), expected, msg);
  }

  read() {
    this.offset = 0;

    for (let i = 0; i < MAGIC.length; i++) {
      this.verifyU8(MAGIC[i], 'file magic');
    }

    this.verifyU8(0xC0, 'notes section start');

    let next;
    while (true) {
      next = this.u8();
      if (next !== 0xA0) break;

      this.verifyU8(0xA2, 'note padding');

      const note = {};
      note.type = this.u8();

      this.verifyU8(0xA3, 'note padding');
      note.lane = this.u8();

      this.verifyU8(0xA4, 'note padding');
      note.time = this.u32();

      console.log(note);

      if (note.type === 0x02) { // held note
        this.verifyU8(0xA6, 'note padding');
        this.verifyU8(0xB3, 'note padding');

        note.endTime = this.u32();

        this.verifyU8(0x00, 'note padding');
        this.verifyU8(0xA7, 'note padding');
      }

      if (note.type === 0x03) { // tech note
        this.verifyU8(0xA6, 'note padding');
        this.verifyU8(0xB6, 'note padding');
        this.verifyU8(0x01, 'note padding');

        note.data = this.u32();

        this.verifyU8(0xA7, 'note padding');
      }

      this.notes.push(note);

      this.verifyU8(0xA1, 'note padding');
    }

    this.verify(next, 0xC1, 'mods section start');

    // todo: mods

    this.verifyU8(0xFF, 'end of chart');

    // todo: signature
  }
}