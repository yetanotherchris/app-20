import { View, type StyleProp, type ViewStyle } from 'react-native'

/**
 * Web stub for react-native-svg. The shared chat component never renders SVG
 * on the web path: the MarkdownRenderer overrides `image` and `linkImage` to
 * return null (FR-007), so no SVG element is produced. react-native-marked
 * imports SvgFromXml at module scope regardless, so alias react-native-svg to
 * this stub on web to avoid bundling react-native-svg's Fabric source (which
 * imports react-native modules react-native-web does not provide).
 */

export interface SvgProps {
  xml: string
  width?: number | string
  height?: number | string
  style?: StyleProp<ViewStyle>
}

function NullSvg(_props: SvgProps) {
  return <View />
}

export const SvgFromXml = NullSvg
export const SvgXml = NullSvg
export const SvgUri = NullSvg
export const SvgFromUri = NullSvg
export const Svg = NullSvg
export const SvgCss = NullSvg
export const SvgWithCss = NullSvg
export const SvgWithCssUri = NullSvg
export const SvgCssUri = NullSvg
export const SvgAst = NullSvg
export const SvgFromAst = NullSvg
export const SvgFromXmlAsync = NullSvg
export const SvgXmlAsync = NullSvg
export const SvgUriAsync = NullSvg
export const SvgFromUriAsync = NullSvg
export const SvgAstAsync = NullSvg
export const SvgFromAstAsync = NullSvg

export const parse = (): unknown => null
export const camelCase = (s: string): string => s
export const fetchText = async (): Promise<string> => ''

export const Circle = NullSvg
export const Ellipse = NullSvg
export const G = NullSvg
export const Line = NullSvg
export const Path = NullSvg
export const Polygon = NullSvg
export const Polyline = NullSvg
export const Rect = NullSvg
export const Text = NullSvg
export const TSpan = NullSvg
export const Defs = NullSvg
export const ClipPath = NullSvg
export const LinearGradient = NullSvg
export const RadialGradient = NullSvg
export const Pattern = NullSvg
export const Stop = NullSvg
export const Image = NullSvg
export const ForeignObject = NullSvg
export const Marker = NullSvg
export const Mask = NullSvg
export const SvgSymbol = NullSvg
export const Symbol = NullSvg
export const Use = NullSvg
export const Switch = NullSvg
export const Filter = NullSvg
export const FeBlend = NullSvg
export const FeColorMatrix = NullSvg
export const FeComponentTransfer = NullSvg
export const FeComposite = NullSvg
export const FeFlood = NullSvg
export const FeGaussianBlur = NullSvg
export const FeImage = NullSvg
export const FeMerge = NullSvg
export const FeMergeNode = NullSvg
export const FeMorphology = NullSvg
export const FeOffset = NullSvg
export const FeSpecularLighting = NullSvg
export const FeTile = NullSvg
export const FeTurbulence = NullSvg
export const FeDropShadow = NullSvg

export default NullSvg
