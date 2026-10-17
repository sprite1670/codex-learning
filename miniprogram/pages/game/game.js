const ICONS = [
  { icon: '🐑', name: '小羊' }, { icon: '🥕', name: '胡萝卜' },
  { icon: '🌽', name: '玉米' }, { icon: '🍎', name: '苹果' },
  { icon: '🍀', name: '四叶草' }, { icon: '🌻', name: '向日葵' },
  { icon: '🍓', name: '草莓' }
];

Page({
  data: { level: 1, steps: 0, remaining: 21, tiles: [], tray: [], emptySlots: [0,1,2,3,4,5,6], message: '', messageType: '' },
  onLoad() { this.restart(); },
  restart() {
    const tiles = [];
    // 21 tiles in triples, spread over three layers. Lower layers are initially covered.
    const shuffled = [...Array(7).keys()].sort(() => Math.random() - .5);
    for (let layer = 0; layer < 3; layer++) {
      for (let i = 0; i < 7; i++) {
        const kind = shuffled[i];
        const row = Math.floor(i / 4), col = i % 4;
        tiles.push({ id: layer * 7 + i, ...ICONS[kind], x: 26 + col * 140 + layer * 16, y: 22 + row * 235 + layer * 20 + (i % 2) * 20, z: layer * 10 + i, layer, removed: false, available: layer === 2 });
      }
    }
    this.setData({ tiles, tray: [], emptySlots: [0,1,2,3,4,5,6], steps: 0, remaining: 21, message: '', messageType: '' });
  },
  pick(e) {
    const id = Number(e.currentTarget.dataset.id);
    const tiles = this.data.tiles;
    const tile = tiles.find(item => item.id === id);
    if (!tile || tile.removed || !tile.available || this.data.message) return;
    const tray = [...this.data.tray, { icon: tile.icon, name: tile.name }];
    tile.removed = true;
    tile.available = false;
    // A tile is available when no non-removed tile in a higher layer overlaps it.
    tiles.forEach(item => {
      if (item.removed) return;
      const blocked = tiles.some(other => !other.removed && other.layer > item.layer && this.overlap(item, other));
      item.available = !blocked;
    });
    const count = tray.filter(item => item.icon === tile.icon).length;
    if (count === 3) {
      let removed = 0;
      for (let i = tray.length - 1; i >= 0 && removed < 3; i--) if (tray[i].icon === tile.icon) { tray.splice(i, 1); removed++; }
    }
    const failed = tray.length >= 7;
    const won = tiles.every(item => item.removed);
    const message = won ? '🎉 恭喜通关！' : failed ? '槽位满了，再试一次' : '';
    this.setData({ tiles, tray, emptySlots: Array(Math.max(0, 7 - tray.length)).fill(0).map((_, i) => i), steps: this.data.steps + 1, remaining: tiles.filter(item => !item.removed).length, message, messageType: won ? 'win' : failed ? 'fail' : '' });
  },
  overlap(a, b) { return Math.abs((a.x + 62) - (b.x + 62)) < 118 && Math.abs((a.y + 62) - (b.y + 62)) < 118; }
});
