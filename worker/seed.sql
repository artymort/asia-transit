INSERT OR IGNORE INTO characteristics (id, name, key, is_required, sort_order) VALUES
  (1, 'Марка', 'brand', 1, 10),
  (2, 'Модель', 'model', 1, 20),
  (3, 'Год выпуска', 'year', 1, 30),
  (4, 'Пробег, км', 'mileage', 1, 40),
  (5, 'Двигатель', 'engine', 0, 50),
  (6, 'Коробка передач', 'transmission', 0, 60),
  (7, 'Привод', 'drive', 0, 70),
  (8, 'Количество владельцев', 'owners', 0, 80),
  (9, 'Состояние', 'condition', 0, 90),
  (10, 'Цена закупки', 'purchase_price', 0, 100),
  (11, 'Комментарий менеджера', 'manager_comment', 0, 110);

INSERT OR IGNORE INTO cars (id, slug, title, brand, model, year, price, mileage, body_type, description, image_path, status, published_at) VALUES
  (1, 'geely-monjaro-2024', 'Geely Monjaro 2024', 'Geely', 'Monjaro', 2024, 3296000, 11400, 'Кроссовер', 'Богатая комплектация, полный привод, панорамная крыша и камеры 360°. Автомобиль проверен и готов к осмотру.', 'assets/geely-monjaro.png', 'published', CURRENT_TIMESTAMP),
  (2, 'kia-k3-2024', 'Kia The New K3 2024', 'Kia', 'The New K3', 2024, 1897000, 33119, 'Седан', 'Экономичный городской седан. Чистый салон, подтвержденный пробег и камера заднего вида.', 'assets/listings/kia-k3-1.webp', 'published', CURRENT_TIMESTAMP),
  (3, 'hyundai-avante-2024', 'Hyundai The New Avante 2024', 'Hyundai', 'The New Avante', 2024, 1950000, 11063, 'Седан', 'Современный седан с небольшим пробегом. Полностью обслужен и готов к осмотру.', 'assets/listings/hyundai-avante-1.webp', 'published', CURRENT_TIMESTAMP),
  (4, 'changan-cs35-plus-2024', 'Changan CS35 Plus 2024', 'Changan', 'CS35 Plus', 2024, 2427000, 13400, 'Кроссовер', 'Компактный кроссовер с турбомотором, мультимедиа и зимним пакетом.', 'assets/listings/changan-cs35-1.jpg', 'published', CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO car_characteristics (car_id, characteristic_id, value, is_public) VALUES
  (1, 5, '2.0 л, бензин, 238 л.с.', 1), (1, 6, 'Автомат', 1), (1, 7, 'Полный', 1),
  (2, 5, '1.6 л, бензин', 1), (2, 6, 'Автомат', 1), (2, 7, 'Передний', 1),
  (3, 5, '1.6 л, бензин', 1), (3, 6, 'Автомат', 1), (3, 7, 'Передний', 1),
  (4, 5, '1.4 л, бензин, турбо', 1), (4, 6, 'Робот', 1), (4, 7, 'Передний', 1);
