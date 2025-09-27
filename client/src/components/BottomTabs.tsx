import { Container, SimpleGrid, Button } from "@mantine/core";
import { useLocation, useNavigate } from "react-router-dom";
import { GlassBar } from "../ui/Glass";

export default function BottomTabs() {
  const nav = useNavigate();
  const loc = useLocation();
  const isActive = (p: string) => loc.pathname === p;

  return (
    <GlassBar style={{
      position:"fixed", bottom:0, left:0, right:0, zIndex:40,
      height:"calc(var(--bottombar-h) + env(safe-area-inset-bottom,0px))",
      paddingBottom:"env(safe-area-inset-bottom,0px)"
    }}>
      <Container size="xs" px="xs" style={{height:"100%"}}>
        <SimpleGrid cols={3} spacing="xs" style={{height:"100%", padding:"6px"}}>
          {[
            {label:"Битстор", path:"/"},
            {label:"Аналитика", path:"/analytics"},
            {label:"Аккаунт", path:"/account"},
          ].map((t)=>(
            <Button key={t.path}
              onClick={()=>nav(t.path)}
              variant={isActive(t.path) ? "filled":"subtle"}
              radius="md"
              styles={{
                root: isActive(t.path)
                  ? { background:"linear-gradient(90deg,#6E6BFF,#2EA1FF)", color:"#fff", border:"1px solid var(--surface-border)" }
                  : { color:"var(--text)" }
              }}
            >
              {t.label}
            </Button>
          ))}
        </SimpleGrid>
      </Container>
    </GlassBar>
  );
}
