import { forwardRef } from "react";

/** Доп. тип: HTML-пропсы для img */
type ImgNativeProps = React.ComponentPropsWithoutRef<"img">;

/** ===== Icon ============================================================
 * Простая обёртка для PNG-иконок.
 * - src: путь к PNG-файлу (строка)
 * - size: ширина/высота иконки (по умолчанию 20)
 * - alt: альтернативный текст (опционально)
 * - className: CSS-классы (опционально)
 * - Передаёт все остальные HTML-пропсы для img (onClick, style и т.д.)
 *
 * @example
 * // Пример использования:
 * // <Icon src="../assets/icons/cart.png" size={24} alt="Корзина" />
 * // <Icon src="../assets/icons/account.png" size={22} alt="Аккаунт" className="my-class" />
 */
export type IconProps = Omit<ImgNativeProps, "src" | "width" | "height"> & {
  src: string;
  size?: number | string;
  alt?: string;
  className?: string;
};

export const Icon = forwardRef<HTMLImageElement, IconProps>(
  ({ src, size = 20, alt = "", className, ...rest }, ref) => {
    return (
      <img
        ref={ref}
        src={src}
        width={size}
        height={size}
        alt={alt}
        className={className}
        {...rest}
      />
    );
  }
);
Icon.displayName = "Icon";
