export type ScrambleCoord = {
  xsrc: number;
  ysrc: number;
  width: number;
  height: number;
  xdest: number;
  ydest: number;
};

export type DescrambleResult = {
  width: number;
  height: number;
  transfers: Array<{
    index: number;
    coords: ScrambleCoord[];
  }>;
};

export type BinbPageImageLike = {
  src: string;
  orgwidth: number;
  orgheight: number;
};

export type BinbSourceDimensions = {
  width: number;
  height: number;
};

export type BinbContentLike = {
  getImageUrl: (src: string, useHighQuality?: boolean) => string;
  getImageDescrambleCoords: (
    image: BinbPageImageLike | string,
    width: number,
    height: number,
  ) => DescrambleResult | null;
};

export function resolveBinbSourceUrl(content: BinbContentLike, image: BinbPageImageLike): string {
  return content.getImageUrl(image.src);
}

export function resolveBinbDescramble(
  content: BinbContentLike,
  image: BinbPageImageLike,
  sourceDimensions?: BinbSourceDimensions,
): DescrambleResult | null {
  const width = sourceDimensions?.width ?? image.orgwidth;
  const height = sourceDimensions?.height ?? image.orgheight;

  try {
    const descramble = content.getImageDescrambleCoords(image, width, height);
    if (descramble) {
      return descramble;
    }
  } catch {}

  return content.getImageDescrambleCoords(image.src, width, height);
}
