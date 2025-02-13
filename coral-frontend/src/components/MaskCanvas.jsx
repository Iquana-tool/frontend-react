import { Stage, Layer, Image, Shape } from 'react-konva'

export default function MaskCanvas({ image, masks, onSelect }) {
  return (
    <div className="border rounded-lg overflow-hidden shadow-lg">
      <Stage width={800} height={600}>
        <Layer>
          <Image image={image} />
          {masks.map((mask, i) => (
            <Shape
              key={i}
              sceneFunc={(ctx, shape) => {
                ctx.beginPath()
                mask.points.forEach(p => ctx.lineTo(p.x, p.y))
                ctx.fillStyle = 'rgba(74, 175, 136, 0.3)'
                ctx.fill()
              }}
              onClick={() => onSelect(mask)}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  )
}