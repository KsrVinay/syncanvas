// simple color generator per user
const colors = [
  "#ff4757",
  "#1e90ff",
  "#2ed573",
  "#ffa502",
  "#a55eea",
  "#70a1ff",
  "#eccc68",
  "#ff6b81"
];

export function assignColorForUser(id){
  const palette = ["#e11d48","#0ea5e9","#10b981","#a78bfa","#f59e0b","#ef4444","#06b6d4"];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}
