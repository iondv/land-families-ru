# IONDV. Large-families

IONDV. Large-families is a software solution based on IONDV. Framework, implemented to organize the accounting, storage and display of data on large families applying for a plot of land. The key essence is an Application that contains descriptive information, a link to information about the family and each of its members in the form of a person.

The main advantage of using the system is to maintain a register of citizens registered as persons who have the right to receive land plots in ownership for free in the territory of the region. In addition, the system provides the maintenance of data on applications simultaneously for different regions, as well as the formation of analytical reports in various views.

## Описание  

**IONDV. Large-families** - это программное решение на основе [IONDV. Framework](https://iondv.com), реализованное для организации учета, хранения и отображения данных о многодетных семьях, претендующих на получение земельного участка по закону ФЗ-№161 от 24.07.2008 «О содействии развитию жилищного строительства». 
Ключевой сущность является Заявление, которое содержит в себе информацию описательного характера, ссылку на информацию о семье и каждого ее члена в виде персоны.

Главное преимущество использования системы - ведение реестра граждан, поставленных на учет в качестве лиц,имеющих право на предоставление земельных участков в собственность бесплатно на территории края.
К тому же применение системы обеспечивает ведение данных о заявлениях одновременно по разным районам, а так же формирование аналитических отчетов в различных представлениях.

### Демо

Демо доступ в систему для ознакомления, без регистрации: https://land-families-ru.iondv.com

Учетная запись для [бек-офиса](https://land-families-ru.iondv.com/registry): пользователь **demo**, пароль **ion-demo**. 

### Дополнительные преимущества:
 
* Открытый исходный код всех компонентов Системы - https://github.com/iondv/land-families-ru;
* Открытое программное обеспечение используемое для СУБД и серверных ОС (работет под linux и windows);
* Возможна любая адаптация и модернизация системы, в том числе структур данных без программирования в [визуальном редакторе](https://studio.iondv.com).
* Запуск собственной версии в течении нескольких минут - см. [Как получить](#как-получить)

### Модули

Основу реестра данных составляет [модуль Регистри](https://github.com/iondv/registry). 
Также используются: 

* [Административный модуль](https://github.com/iondv/ionadmin) - позволяет управлять пользователями и ролями для доступа к системе и другими функциями, неоходимыми администартору, 
* [модуль Дашборда](https://github.com/iondv/dashboard) - отображение контрольной панели, с указанием наглядной информации в виде графиков о степени нагрузки системы,
* [модуль Аналитики](https://github.com/iondv/report) - построение аналитических отчетов на основе данных, заведенных в системе.  

## Как получить?  

### Git

Быстрый старт с использованием репозитория IONDV. Large-families на GitHub — [подробная инструкция](https://github.com/iondv/framework/blob/master/docs/ru/readme.md#быстрый-старт-с-использованием-репозитория).  

1. Установите системное окружение и глобальные зависимости.
2. Клонируйте ядро, модуль и приложение.
3. Соберите и разверните приложение.
4. Запустите.

Или установка и запуск в одну строку под Linux с использованием установщика [iondv-app](https://github.com/iondv/iondv-app) (требуется локально node.js, MongoDB и Git):
```
curl -L -s https://github.com/iondv/iondv-app/archive/master.zip > iondv-app.zip &&\
  unzip -p iondv-app.zip iondv-app-master/iondv-app > iondv-app &&\
  bash iondv-app -q -i -m localhost:27017 land-families-ru
```
Где вместо `localhost:27017` нужно указать адрес MongoDb. После запуска открыть ссылку 'http://localhost:8888', учетная запись бек офиса **demo**, пароль **ion-demo**.

### Docker

Запуск приложения с использованием докер контейнера - [подробная инструкция](https://hub.docker.com/r/iondv/land-families-ru).

1. Запустите СУБД mongodb: `docker run --name mongodb -v mongodb_data:/data/db -p 27017:27017 -d mongo`
2. Запустите IONDV. Large-families `docker run -d -p 80:8888 --link mongodb iondv/land-families-ru`.
3. Откройте ссылку `http://localhost` в браузере через минуту (время требуется для инициализации данных). Для бек офиса логин: **demo**, пароль: **ion-demo** 

## Ссылки

Для дополнительной информации смотрите следующие ресурсы:

* [Руководство пользователя IONDV. Large-families](manuals/RP_langFamilies.docx)
* [IONDV. Framework](https://iondv.com/) 
* [Facebook](https://www.facebook.com/iondv/)

--------------------------------------------------------------------------  


#### [Licence](/LICENSE) &ensp; [Contact us](https://iondv.com/contacts) &ensp; [Stack Overflow](https://stackoverflow.com/questions/tagged/iondv) &ensp; [FAQs](/faqs.md)          
<div><img src="https://mc.iondv.com/watch/github/docs/land-families-ru" style="position:absolute; left:-9999px;" height=1 width=1 alt="iondv metrics"></div>


--------------------------------------------------------------------------  

Copyright (c) 2018 **LLC "ION DV".**  
All rights reserved.

