"use client";

import { useState } from "react";
import { Card, Text, Accordion, List, Button } from "@mantine/core";

export default function TrackingInstructions() {
  const [show, setShow] = useState(true);

  if (!show) return null;

  return (
    <Card withBorder mb="md" style={{ position: "relative" }}>
      <Button
        size="xs"
        variant="subtle"
        onClick={() => setShow(false)}
        style={{ position: "absolute", top: 10, right: 10 }}
      >
        Скрыть
      </Button>

      <Text size="lg" fw={700} mb="md">
        Руководство по использованию системы отслеживания
      </Text>

      <Accordion>
        <Accordion.Item value="overview">
          <Accordion.Control>Общая информация</Accordion.Control>
          <Accordion.Panel>
            <Text size="sm">
              Система отслеживания оборудования позволяет управлять всем
              оборудованием организации, отслеживать его местоположение,
              передачи между сотрудниками, а также сохранять историю передач в
              блокчейне для дополнительной безопасности и прозрачности.
            </Text>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="equipment">
          <Accordion.Control>Управление оборудованием</Accordion.Control>
          <Accordion.Panel>
            <List size="sm">
              <List.Item>
                <Text span fw={500}>
                  Добавление:
                </Text>{" "}
                Нажмите кнопку Добавить оборудование и заполните форму
              </List.Item>
              <List.Item>
                <Text span fw={500}>
                  Редактирование:
                </Text>{" "}
                Выберите оборудование в таблице и нажмите на иконку меню (три
                точки), затем Редактировать
              </List.Item>
              <List.Item>
                <Text span fw={500}>
                  Удаление:
                </Text>{" "}
                Выберите оборудование и нажмите Удалить в меню действий
              </List.Item>
              <List.Item>
                <Text span fw={500}>
                  Передача:
                </Text>{" "}
                Выберите оборудование и нажмите кнопку Передать оборудование
              </List.Item>
            </List>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="blockchain">
          <Accordion.Control>Интеграция с блокчейном</Accordion.Control>
          <Accordion.Panel>
            <Text size="sm" mb="xs">
              Для дополнительной безопасности и прозрачности вы можете:
            </Text>
            <List size="sm">
              <List.Item>
                Зарегистрировать оборудование в блокчейне (через меню действий)
              </List.Item>
              <List.Item>
                Просмотреть историю передач из блокчейна во вкладке История
                передач
              </List.Item>
              <List.Item>
                Проверить статус записи передачи в блокчейне (значок
                Подтверждено)
              </List.Item>
            </List>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Card>
  );
}
