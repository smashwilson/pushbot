// Operating modes for the database recorder.

class Mode {
  constructor(names) {
    this.names = names.concat(['default']);
  }

  when(callbacks) {
    for (let i = 0; i < this.names.length; i++) {
      const name = this.names[i];
      if (callbacks[name]) {
        return callbacks[name]();
      }
    }
    throw new Error(`Unexpected mode: ${this.names[0]}`);
  }
}

exports.Verifying = new Mode(['verifying', 'online']);
exports.Recording = new Mode(['recording', 'online']);
exports.Offline = new Mode(['offline']);
