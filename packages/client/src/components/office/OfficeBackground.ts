import { Container, Graphics } from "pixi.js";

const TILE_SIZE = 32;
const FLOOR_COLOR_1 = 0x2d3748;
const FLOOR_COLOR_2 = 0x374151;
const WALL_COLOR = 0x4b5563;
const WALL_HEIGHT = 60;

export class OfficeBackground {
  public container: Container;

  constructor(width: number, height: number) {
    this.container = new Container();

    // Wall
    const wall = new Graphics()
      .rect(0, 0, width, WALL_HEIGHT)
      .fill({ color: WALL_COLOR })
      .rect(0, WALL_HEIGHT - 4, width, 4)
      .fill({ color: 0x6b7280 });
    this.container.addChild(wall);

    // Tiled floor
    const cols = Math.ceil(width / TILE_SIZE);
    const rows = Math.ceil((height - WALL_HEIGHT) / TILE_SIZE);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const color = (row + col) % 2 === 0 ? FLOOR_COLOR_1 : FLOOR_COLOR_2;
        const tile = new Graphics()
          .rect(
            col * TILE_SIZE,
            WALL_HEIGHT + row * TILE_SIZE,
            TILE_SIZE,
            TILE_SIZE
          )
          .fill({ color });
        this.container.addChild(tile);
      }
    }

    // Window on wall
    const windowBg = new Graphics()
      .rect(width / 2 - 40, 10, 80, 35)
      .fill({ color: 0x87ceeb })
      .stroke({ color: 0x9ca3af, width: 2 });
    this.container.addChild(windowBg);

    // Window cross bars
    const windowCross = new Graphics()
      .rect(width / 2 - 1, 10, 2, 35)
      .fill({ color: 0x9ca3af })
      .rect(width / 2 - 40, 26, 80, 2)
      .fill({ color: 0x9ca3af });
    this.container.addChild(windowCross);
  }
}
