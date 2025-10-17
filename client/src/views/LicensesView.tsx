import { useState } from "react";
import {
  Stack,
  Text,
  Button,
  Group,
  Paper,
  TextInput,
  NumberInput,
  Modal,
  Divider,
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import { IconEdit, IconTrash, IconPlus, IconCheck } from "@tabler/icons-react";
import { useApp, type License } from "../store";
import { GlassCard, NeonButton } from "../ui/Glass";

export default function LicensesView() {
  const { me, beats, updateBeatPrices, licenses, updateLicense, addLicense, deleteLicense } = useApp();
  const plan = me.plan || "free";

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [addModalOpened, setAddModalOpened] = useState(false);
  const [newLicenseName, setNewLicenseName] = useState("");
  const [newLicensePrice, setNewLicensePrice] = useState<number | "">("");

  const canEditNames = plan === "basic" || plan === "pro";
  const canAddNew = plan === "basic" || plan === "pro";

  const handlePriceChange = (licenseId: string, price: number | "") => {
    updateLicense(licenseId, { defaultPrice: price === "" ? null : price });
  };

  const handleApplyToAll = async (licenseId: string) => {
    const license = licenses.find((l) => l.id === licenseId);
    if (!license || license.defaultPrice === null) return;

    // Применяем цену ко всем битам
    const updatePromises = beats.map((beat) => {
      // Создаем новый объект prices в старом формате (number) для API
      const oldFormatPrices: any = {};
      Object.entries(beat.prices).forEach(([key, value]) => {
        if (value && typeof value === "object") {
          oldFormatPrices[key] = value.price;
        } else {
          oldFormatPrices[key] = value;
        }
      });
      oldFormatPrices[licenseId] = license.defaultPrice;

      return updateBeatPrices(beat.id, oldFormatPrices);
    });

    try {
      await Promise.all(updatePromises);
      alert(`Цена ${license.name} ($${license.defaultPrice}) применена ко всем битам в БД!`);
    } catch (error) {
      alert("Ошибка при обновлении цен в БД. Проверьте консоль.");
      console.error(error);
    }
  };

  const handleStartRename = (license: License) => {
    setEditingId(license.id);
    setEditingName(license.name);
  };

  const handleSaveRename = () => {
    if (!editingName.trim() || !editingId) return;

    updateLicense(editingId, { name: editingName.trim() });
    setEditingId(null);
    setEditingName("");
  };

  const handleCancelRename = () => {
    setEditingId(null);
    setEditingName("");
  };

  const handleAddLicense = () => {
    if (!newLicenseName.trim() || newLicensePrice === "") return;

    const newLicense: License = {
      id: `custom_${Date.now()}`,
      name: newLicenseName.trim(),
      defaultPrice: Number(newLicensePrice),
    };

    addLicense(newLicense);
    setAddModalOpened(false);
    setNewLicenseName("");
    setNewLicensePrice("");
  };

  const handleDeleteLicense = (licenseId: string) => {
    // Нельзя удалить базовые лицензии
    if (["mp3", "wav", "stems"].includes(licenseId)) {
      alert("Нельзя удалить базовую лицензию!");
      return;
    }

    if (!confirm("Удалить эту лицензию?")) return;
    deleteLicense(licenseId);
  };

  return (
    <>
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <div>
            <Text fw={600} size="lg" style={{ color: "var(--text)" }}>
              Управление лицензиями
            </Text>
            <Text size="sm" c="var(--muted)" mt={4}>
              Установите цены для лицензий и примените их ко всем битам
            </Text>
          </div>
          {canAddNew && (
            <Button
              size="sm"
              leftSection={<IconPlus size={16} />}
              onClick={() => setAddModalOpened(true)}
              styles={{
                root: {
                  background: "linear-gradient(90deg, #6E6BFF, #2EA1FF)",
                  border: "none",
                },
              }}
            >
              Добавить лицензию
            </Button>
          )}
        </Group>

        {!canEditNames && (
          <Paper
            p="sm"
            radius="md"
            style={{
              background: "rgba(255,165,0,0.1)",
              border: "1px solid rgba(255,165,0,0.3)",
            }}
          >
            <Text size="sm" c="orange">
              💡 Обновите план до <strong>Basic</strong> или <strong>Pro</strong>, чтобы
              переименовывать лицензии и добавлять свои!
            </Text>
          </Paper>
        )}

        <Stack gap="sm">
          {licenses.map((license) => (
            <GlassCard key={license.id} style={{ padding: "16px" }}>
              <Group justify="space-between" wrap="nowrap">
                <div style={{ flex: 1 }}>
                  {editingId === license.id ? (
                    <Group gap="xs">
                      <TextInput
                        value={editingName}
                        onChange={(e) => setEditingName(e.currentTarget.value)}
                        maxLength={20}
                        size="sm"
                        style={{ maxWidth: 200 }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveRename();
                          if (e.key === "Escape") handleCancelRename();
                        }}
                      />
                      <ActionIcon
                        color="green"
                        variant="light"
                        onClick={handleSaveRename}
                      >
                        <IconCheck size={16} />
                      </ActionIcon>
                      <ActionIcon
                        color="red"
                        variant="light"
                        onClick={handleCancelRename}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                  ) : (
                    <Group gap="xs">
                      <Text fw={600} size="md" c="var(--text)">
                        {license.name}
                      </Text>
                      {canEditNames && (
                        <Tooltip label="Переименовать">
                          <ActionIcon
                            size="sm"
                            variant="subtle"
                            onClick={() => handleStartRename(license)}
                          >
                            <IconEdit size={14} />
                          </ActionIcon>
                        </Tooltip>
                      )}
                      {!["mp3", "wav", "stems"].includes(license.id) &&
                        canAddNew && (
                          <Tooltip label="Удалить">
                            <ActionIcon
                              size="sm"
                              variant="subtle"
                              color="red"
                              onClick={() => handleDeleteLicense(license.id)}
                            >
                              <IconTrash size={14} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                    </Group>
                  )}
                </div>

                <Group gap="xs" wrap="nowrap">
                  <NumberInput
                    value={license.defaultPrice ?? ""}
                    onChange={(val) => handlePriceChange(license.id, typeof val === "string" ? "" : val)}
                    placeholder="Цена"
                    min={0}
                    hideControls
                    leftSection={
                      <Text size="xs" fw={600} c="var(--muted)" pl={4}>
                        $
                      </Text>
                    }
                    styles={{
                      input: {
                        width: 120,
                        color: "var(--text)",
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.12)",
                      },
                    }}
                  />
                  <Button
                    size="sm"
                    variant="light"
                    disabled={license.defaultPrice === null}
                    onClick={() => handleApplyToAll(license.id)}
                    styles={{
                      root: {
                        background:
                          license.defaultPrice !== null
                            ? "rgba(110,107,255,0.15)"
                            : undefined,
                      },
                    }}
                  >
                    Применить ко всем
                  </Button>
                </Group>
              </Group>
            </GlassCard>
          ))}
        </Stack>

        <Divider my="md" />

        <Paper
          p="md"
          radius="md"
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <Stack gap="xs">
            <Text size="sm" fw={600} c="var(--text)">
              📊 Статистика
            </Text>
            <Text size="sm" c="var(--muted)">
              Всего битов: <strong>{beats.length}</strong>
            </Text>
            <Text size="sm" c="var(--muted)">
              Всего лицензий: <strong>{licenses.length}</strong>
            </Text>
          </Stack>
        </Paper>
      </Stack>

      {/* Модальное окно добавления лицензии */}
      <Modal
        opened={addModalOpened}
        onClose={() => setAddModalOpened(false)}
        centered
        title="Добавить новую лицензию"
        styles={{
          title: {
            color: "var(--text)",
            fontWeight: 600,
          },
        }}
      >
        <Stack gap="md">
          <TextInput
            label="Название лицензии"
            placeholder="Например: Exclusive"
            value={newLicenseName}
            onChange={(e) => setNewLicenseName(e.currentTarget.value)}
            maxLength={20}
          />
          <NumberInput
            label="Цена по умолчанию"
            placeholder="0"
            value={newLicensePrice}
            onChange={(val) => setNewLicensePrice(typeof val === "string" ? "" : val)}
            min={0}
            hideControls
            leftSection={
              <Text size="xs" fw={600} c="var(--muted)" pl={4}>
                $
              </Text>
            }
          />
          <Group justify="flex-end" gap="xs">
            <Button variant="subtle" onClick={() => setAddModalOpened(false)}>
              Отмена
            </Button>
            <NeonButton
              onClick={handleAddLicense}
              disabled={!newLicenseName.trim() || newLicensePrice === ""}
            >
              Добавить
            </NeonButton>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
