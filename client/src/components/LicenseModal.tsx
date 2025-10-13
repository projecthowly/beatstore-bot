import { Popover, Stack, Group, Button, Text, Box, ActionIcon } from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import { useState, useEffect } from "react";
import { notifications } from "@mantine/notifications";
import type { Beat, LicenseType } from "../types";
import { useApp } from "../store";

type LicenseModalProps = {
  beat: Beat;
  opened: boolean;
  onClose: () => void;
  targetRef: React.RefObject<HTMLElement | null>;
};

export default function LicenseModal({ beat, opened, onClose, targetRef }: LicenseModalProps) {
  const { addToCart } = useApp();
  const [selectedLicense, setSelectedLicense] = useState<LicenseType | null>(null);

  // Собираем доступные лицензии
  const availableLicenses: Array<{ type: LicenseType; name: string; price: number }> = [];
  if (beat.prices.mp3) availableLicenses.push({ type: "mp3", name: "MP3", price: beat.prices.mp3 });
  if (beat.prices.wav) availableLicenses.push({ type: "wav", name: "WAV", price: beat.prices.wav });
  if (beat.prices.stems) availableLicenses.push({ type: "stems", name: "STEMS", price: beat.prices.stems });

  // Выбираем минимальную лицензию по цене при открытии
  useEffect(() => {
    if (opened && availableLicenses.length > 0) {
      const minPriceLicense = availableLicenses.reduce((min, license) =>
        license.price < min.price ? license : min
      );
      setSelectedLicense(minPriceLicense.type);
    }
  }, [opened]);

  const handleBuyNow = () => {
    notifications.show({
      title: "В разработке",
      message: "Функция 'Купить сейчас' находится в разработке",
      color: "blue",
    });
    onClose();
  };

  const handleAddToCart = () => {
    if (selectedLicense) {
      addToCart(beat.id, selectedLicense);
      onClose();
    }
  };

  return (
    <Popover
      opened={opened}
      onClose={onClose}
      position="bottom"
      withArrow
      shadow="md"
      offset={8}
      withinPortal
      styles={{
        dropdown: {
          maxWidth: "min(320px, 90vw)",
        },
      }}
    >
      <Popover.Target>
        <div ref={targetRef as React.RefObject<HTMLDivElement>} />
      </Popover.Target>
      <Popover.Dropdown
        style={{
          background: "linear-gradient(180deg, rgba(20,20,20,0.98), rgba(15,15,15,0.98))",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 8px 30px rgba(0,0,0,0.6)",
          padding: "12px",
          width: "min(300px, 90vw)",
          borderRadius: "12px",
        }}
      >
        <Stack gap="sm">
          <Group justify="space-between" wrap="nowrap" align="center">
            <Text
              size="sm"
              fw={600}
              c="var(--text)"
              style={{
                flex: 1,
                textAlign: "left",
                fontSize: "clamp(13px, 3.5vw, 14px)",
              }}
            >
              Выберите лицензию
            </Text>
            <ActionIcon
              variant="transparent"
              size="sm"
              onClick={onClose}
              style={{
                cursor: "pointer",
                backgroundColor: "transparent",
                border: "1px solid rgba(255,255,255,0.3)",
                borderRadius: "6px",
                minWidth: "28px",
                minHeight: "28px",
              }}
            >
              <IconX size={14} color="white" />
            </ActionIcon>
          </Group>

          <Stack gap="6px">
            {availableLicenses.map((license) => {
              const isSelected = selectedLicense === license.type;
              return (
                <Box
                  key={license.type}
                  onClick={() => setSelectedLicense(license.type)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "10px",
                    border: isSelected
                      ? "none"
                      : "2px solid rgba(255,255,255,0.1)",
                    background: isSelected
                      ? "linear-gradient(90deg, #6E6BFF, #2EA1FF)"
                      : "rgba(255,255,255,0.05)",
                    cursor: "pointer",
                    transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                    transform: isSelected ? "scale(1.02)" : "scale(1)",
                    opacity: isSelected ? 1 : 0.85,
                    boxShadow: isSelected
                      ? "0 4px 20px rgba(110, 107, 255, 0.4)"
                      : "none",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.opacity = "1";
                      e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.opacity = "0.85";
                      e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                    }
                  }}
                >
                  <Group justify="space-between" wrap="nowrap">
                    <Text
                      size="sm"
                      fw={isSelected ? 600 : 500}
                      c={isSelected ? "#fff" : "var(--text)"}
                      style={{
                        transition: "all 0.3s ease",
                        fontSize: "clamp(12px, 3.5vw, 14px)",
                      }}
                    >
                      {license.name}
                    </Text>
                    <Text
                      size="sm"
                      fw={600}
                      c={isSelected ? "#fff" : "var(--text)"}
                      style={{
                        transition: "all 0.3s ease",
                        fontSize: "clamp(12px, 3.5vw, 14px)",
                      }}
                    >
                      ${license.price}
                    </Text>
                  </Group>
                </Box>
              );
            })}
          </Stack>

          <Group gap="xs" mt="xs" wrap="nowrap">
            <Button
              variant="outline"
              size="xs"
              onClick={handleBuyNow}
              style={{
                flex: 1,
                borderColor: "rgba(255,255,255,0.2)",
                color: "var(--text)",
                fontSize: "clamp(11px, 3vw, 12px)",
                height: "34px",
                whiteSpace: "nowrap",
                padding: "0 8px",
              }}
            >
              Купить
            </Button>
            <Button
              size="xs"
              onClick={handleAddToCart}
              disabled={!selectedLicense}
              style={{
                flex: 1,
                background: "linear-gradient(90deg,#6E6BFF,#2EA1FF)",
                color: "#fff",
                fontSize: "clamp(11px, 3vw, 12px)",
                height: "34px",
                border: "none",
                padding: "0 8px",
              }}
            >
              В корзину
            </Button>
          </Group>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
