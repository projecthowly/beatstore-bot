import React, { forwardRef } from "react";
import { Box, Button, type BoxProps, type ButtonProps } from "@mantine/core";

/** Доп. тип: HTML-пропсы для нужного тега (div/button) */
type DivNativeProps = React.ComponentPropsWithoutRef<"div">;
type ButtonNativeProps = React.ComponentPropsWithoutRef<"button">;

/** ===== GlassCard =======================================================
 * Полноценная «стеклянная» карточка.
 * - Передаёт ВСЕ пропсы Box (margin/padding, onClick и т.д.)
 * - Плюс нативные div-пропсы (например, role, aria-*).
 * - Имеет children по типу.
 */
export type GlassCardProps = BoxProps & DivNativeProps;

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ children, style, ...rest }, ref) => {
    return (
      <Box
        ref={ref}
        {...rest}
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow:
            "0 8px 30px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08)",
          borderRadius: 16,
          ...style,
        }}
      >
        {children}
      </Box>
    );
  }
);
GlassCard.displayName = "GlassCard";

/** ===== NeonButton ======================================================
 * Светящаяся кнопка.
 * - Полностью типобезопасные пропсы Mantine Button + нативные button-пропсы.
 */
export type NeonButtonProps = ButtonProps & ButtonNativeProps;

export const NeonButton = forwardRef<HTMLButtonElement, NeonButtonProps>(
  ({ style, ...rest }, ref) => {
    return (
      <Button
        ref={ref}
        radius="md"
        styles={{
          root: {
            background: "linear-gradient(90deg, #6E6BFF 0%, #2EA1FF 100%)",
            color: "white",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow:
              "0 6px 18px rgba(110,107,255,0.35), 0 6px 22px rgba(46,161,255,0.28)",
          },
        }}
        style={style}
        {...rest}
      />
    );
  }
);
NeonButton.displayName = "NeonButton";

/** ===== GlassBar ========================================================
 * Полупрозрачная панель (топбар/табар).
 * - Типы как у Box + div.
 */
export type GlassBarProps = BoxProps & DivNativeProps;

export const GlassBar = forwardRef<HTMLDivElement, GlassBarProps>(
  ({ children, style, ...rest }, ref) => {
    return (
      <Box
        ref={ref}
        {...rest}
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          borderTop: "1px solid rgba(255,255,255,0.12)",
          borderBottom: "1px solid rgba(255,255,255,0.12)",
          ...style,
        }}
      >
        {children}
      </Box>
    );
  }
);
GlassBar.displayName = "GlassBar";
