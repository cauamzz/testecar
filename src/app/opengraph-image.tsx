import { ImageResponse } from "next/og";
export const alt = "NovaDrive Motors — compra, venda e troca de veículos";
export const size = { width:1200, height:630 };
export const contentType = "image/png";
export default function OpenGraphImage() {
  return new ImageResponse(<div style={{width:"100%",height:"100%",display:"flex",flexDirection:"column",background:"#111",color:"white",padding:"70px",borderBottom:"24px solid #e00000",justifyContent:"space-between"}}>
    <div style={{display:"flex",alignItems:"center",gap:22}}><div style={{display:"flex",gap:8,transform:"skewX(-16deg)"}}>{[44,64,36].map((h,i)=><div key={i} style={{width:15,height:h,background:"#e00000"}}/>)}</div><div style={{fontSize:48,fontWeight:700}}>NovaDrive Motors</div></div>
    <div style={{display:"flex",flexDirection:"column",gap:18}}><div style={{fontSize:72,fontWeight:700,lineHeight:1.1}}>Seu próximo carro começa aqui.</div><div style={{fontSize:28,color:"#ddd"}}>Compra, venda e troca de veículos</div></div>
    <div style={{fontSize:22,color:"#ddd"}}>Conheça nosso estoque e converse com a equipe.</div>
  </div>,size);
}
