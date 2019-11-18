var fs = require('fs');
/**
 * @param {{}} options
 * @param {DataRepository} options.dataRepo
 * @param {DataRepository} options.fileStorage
 * @constructor
 */
function ChildzemService(options) {
  /**
   @typedef {Object} Declaration
   @property {object} dannyeZayavi  -  Данные заявителя
   @property {string} orGoVlIlMeSa  -  Орган государственной власти или местного самоуправления
   @property {boolean} sPZPPDNZPZFSI  -  Состою(им) на учете в качестве граждан, нуждающихся в предоставлении...
   @property {object} dannyeMateri  -  Данные матери
   @property {object} dannyeOSeme  -  Данные отца
   @property {array} deti  -  Дети
   @property {boolean} estUsynDeti  -  Есть усыновленные дети
   @property {boolean} odinRoditel  -  Один родитель
   @property {boolean} rastorBrak  -  Расторжен брак
   @property {object} dannPredZaya  -  Данные представителя заявителя
   @property {object} typePet  -  Вид заявления
   @property {object} tsePreZemUch  -  Цель предоставления земельного участка
   @property {string} zhelRazmUcha  -  Желаемое размещение участка
   @property {string} zhePloUchDo  -  Желаемая площадь участка, до
   @property {string} zhePloUchOt  -  Желаемая площадь участка, от
   @property {object} adNaRaVPoZa  -  Адрес направления расписки в получении заявления
   @property {object} adrePochOtpr  -  Адрес почтового отправления
   @property {object} aSSUPNRZUUONP  -  Адрес направления решения о снятии с учета, приглашения на распределение...
   @property {object} kGKUTSSPN  -  КГКУ ЦСПН
   @property {object} mFTS  -  МФЦ
   @property {boolean} proOsuDopInf  -  Прошу осуществлять дополнительное информирование
   @property {object} sposPoluDoku  -  Способ получения документов
   @property {string} startArea
   @property {string} endArea
   @property {object} mestZemeUcha  -  Местоположение земельного участка
   @property {buffer} dPOVUPNPZUVSB  -  Файл
   @property {boolean} dPOVUPNPZUVSBCheck  -  Документ, подтверждающий обстоятельства, влекущие утрату права...
   @property {dateTime} dPOVUPNPZUVSBDate  -  Дата файла
   @property {string} dPOVUPNPZUVSBMime  -  Тип файла
   @property {string} dPOVUPNPZUVSBName  -  название
   @property {number} dPOVUPNPZUVSBSize  -  размер файла
   @property {buffer} doPoPoPrZa
   @property {boolean} doPoPoPrZaCheck
   @property {dateTime} doPoPoPrZaDate
   @property {string} doPoPoPrZaMime
   @property {string} doPoPoPrZaName
   @property {number} doPoPoPrZaSize
   @property {buffer} kopiOrigZaya  -  Файл
   @property {boolean} kopiOrigZayaCheck  -  Копия оригинального заявления
   @property {dateTime} kopiOrigZayaDate  -  Дата файла
   @property {string} kopiOrigZayaMime  -  Тип файла
   @property {string} kopiOrigZayaName  -  название
   @property {number} kopiOrigZayaSize  -  размер файла
   @property {buffer} sDCSNPZODCMS  -  Файл
   @property {boolean} sDCSNPZODCMSCheck
   @property {dateTime} sDCSNPZODCMSDate  -  Дата файла
   @property {string} sDCSNPZODCMSMime  -  Тип файла
   @property {string} sDCSNPZODCMSName  -  название
   @property {number} sDCSNPZODCMSSize  -  размер файла
   @property {buffer} svOZarBr  -  Файл
   @property {boolean} svOZarBrCheck  -  Свидетельства о заключении (расторжении) брака
   @property {dateTime} svOZarBrDate  -  Дата файла
   @property {string} svOZarBrMime  -  Тип файла
   @property {string} svOZarBrName  -  название
   @property {number} svOZarBrSize  -  размер файла
   @property {buffer} dokUdoLicRod  -  Файл
   @property {boolean} dokUdoLicRodCheck  -  Документы удостоверяющих личность родителей
   @property {dateTime} dokUdoLicRodDate  -  Дата файла
   @property {string} dokUdoLicRodMime  -  Тип файла
   @property {string} dokUdoLicRodName  -  название
   @property {number} dokUdoLicRodSize  -  размер файла
   @property {buffer} sOROUND  -  Файл
   @property {boolean} sOROUNDCheck  -  Свидетельства о рождении (свидетельства об усыновлении) несовершеннолетних детей
   @property {dateTime} sOROUNDDate  -  Дата файла
   @property {string} sOROUNDMime  -  Тип файла
   @property {string} sOROUNDName  -  название
   @property {number} sOROUNDSize  -  размер файла
   @property {boolean} pRZOVHKVTCVAR  -  Подтверждаю свое согласие, а также согласие членов многодетной семьи...
   @property {boolean} nFNMPZEDDISDS  -  Настоящим подтверждаю: - с порядком постановки на учет и предоставления...
   @property {boolean} oVNSPUOPUPMIV  -  Обязуюсь письменно сообщать об обстоятельствах, влекущих утрату права...
   @property {string} poNomeTele  -  По номеру телефона
   @property {string} poAdrElePoc  -  По адресу электронной почты
   @property {boolean} poDovere  -  По доверенности
   @property {string} dannyeDovere  -  Данные доверенности
   @property {boolean} zemUchOfoSam  -  Земельный участок оформлен самостоятельно
   */
  /**
   @typedef {Object} wmAddres
   @property {String} building  -   Корпус дома
   @property {String} postOffice  -   Почтовое отделение
   @property {Object} street  -   Улица
   @property {String} houseNumber  -   Только номер дома.
   @property {String} addrText  -   Адрес при отсутствиии в КЛАДР
   @property {Object} country  -   Страна
   @property {String} guid  -   Глобальный идентификатор
   @property {Object} federationBorough  -   Район субьекта федерации
   @property {Object} subjectFederation  -   Субьект Федерации
   @property {String} zipCode  -   Индекс
   @property {Number} ouid  -   ouid
   @property {Object} superTown  -   Административно вышестоящий город
   @property {String} townBorough  -   Район н/п
   @property {Object} town  -   Населенный пункт
   @property {String} flatNumber  -   Номер квартиры
   @property {String distrTown
   */
  /**
   @typedef {Object} person
   @property {String} lastName  -  Фамилия
   @property {String} firstName  -  Имя
   @property {String} patronName  -  Отчество
   @property {String} sex  -  Пол
   @property {String} snils  -  СНИЛС
   @property {dateTime} dateOfBirth  -  Дата рождения
   @property {String} email  -  Адрес электронной почты
   @property {String} tel  -  Телефон
   @property {wmAddress} addressReg  -  Адрес местожительства (регистрации)
   @property {wmAddress} factAddr  -  Фактический адрес
   @property {Boolean} factAddrDiff  -  Фактический адрес отличается
   @property {dateTime} dateOfPlaceReg  -  Дата регистрации по месту жительства
   @property {String} typeDoc  -  Тип документа удостоверяющего личность
   @property {dateTime} dateOfPlace  -  Дата выдачи
   @property {String} placeDoc  -  Кем выдан
   @property {String} seria  -  Серия
   @property {String} numberDoc  -  Номер
   */
  var dr = options.dataRepo;
  var rs = options.fileStorage;
  var blacklist = ['Антенный пер_364286', 'сот Дружба тер_364286', 'Чукотская 1-я ул_389025'];
  /**
   * Функция используется для создания wsdl описания сервиса.
   * @return {Object} Объект, содержащий три поля: types, mesages, operations. Каждое поле - в свою очередь объект,
   * описывающий свою часть сервиса.
   */
  this.getMeta = function () {
    return {
      types: {
        petitionSource: {
          adNaRaVPoZa: 'address',
          aSSUPNRZUUONP: 'address',
          adrePochOtpr: 'address',
          doPoPoPrZaSize: 'Integer',
          oVNSPUOPUPMIV: 'Boolean',
          sDCSNPZODCMSSize: 'Integer',
          kopiOrigZayaMime: 'String',
          sOROUND: 'Base64',
          sOROUNDMime: 'String',
          workEndDate: 'DateTime',
          svOZarBrCheck: 'Boolean',
          zemUchOfoSam: 'Boolean',
          sDCSNPZODCMSDate: 'DateTime',
          systemClassCode: 'String',
          kGKUTSSPN: 'kGKUTSSPN',
          dokUdoLicRodName: 'String',
          proOsuDopInf: 'Boolean',
          ouid: 'Integer',
          nFNMPZEDDISDS: 'Boolean',
          svOZarBrName: 'String',
          login: 'Integer',
          poAdrElePoc: 'String',
          sOROUNDName: 'String',
          svOZarBrDate: 'DateTime',
          dokUdoLicRodCheck: 'Boolean',
          dannyeMateri: 'personNew',
          dPOVUPNPZUVSBCheck: 'Boolean',
          poDovere: 'Boolean',
          dPOVUPNPZUVSBSize: 'Integer',
          rastorBrak: 'Boolean',
          number: 'Integer',
          dPOVUPNPZUVSB: 'Base64',
          dPOVUPNPZUVSBName: 'String',
          svOZarBrSize: 'Integer',
          kopiOrigZayaCheck: 'Boolean',
          hasSurveyMkgu: 'Boolean',
          tsePreZemUch: 'tsePreZemUch',
          doPoPoPrZaCheck: 'Boolean',
          dannyeOSeme: 'personNew',
          mvReqCheck: 'Boolean',
          pRZOVHKVTCVAR: 'Boolean',
          applicant: 'Integer',
          sOROUNDSize: 'Integer',
          dokUdoLicRod: 'Base64',
          startDate: 'DateTime',
          timeStamp: 'DateTime',
          state: 'state',
          doPoPoPrZaMime: 'String',
          sDCSNPZODCMSName: 'String',
          sDCSNPZODCMSCheck: 'Boolean',
          caseNumber: 'Integer',
          dPOVUPNPZUVSBMime: 'String',
          kopiOrigZaya: 'Base64',
          sPZPPDNZPZFSI: 'Boolean',
          kopiOrigZayaDate: 'DateTime',
          dannPredZaya: 'personNew',
          createDate: 'DateTime',
          typePet: 'typePet',
          partDocs: 'Boolean',
          odinRoditel: 'Boolean',
          orGoVlIlMeSa: 'String',
          doPoPoPrZaDate: 'DateTime',
          kopiOrigZayaSize: 'Integer',
          sposPoluDoku: 'sposPoluDoku',
          deti: 'params[]',
          maker: 'String',
          doPoPoPrZaName: 'String',
          isObjFixed: 'Boolean',
          dannyeZayavi: 'personNew',
          kopiOrigZayaName: 'String',
          dokUdoLicRodMime: 'String',
          isNeedOriginal: 'Boolean',
          svOZarBr: 'Base64',
          guid: 'String',
          dokUdoLicRodSize: 'Integer',
          svOZarBrMime: 'String',
          poNomeTele: 'Integer',
          mestZemeUcha: 'mestZemeUcha',
          dokUdoLicRodDate: 'DateTime',
          dPOVUPNPZUVSBDate: 'DateTime',
          sOROUNDCheck: 'Boolean',
          sOROUNDDate: 'DateTime',
          sDCSNPZODCMS: 'Base64',
          estUsynDeti: 'Boolean',
          editType: 'Integer',
          sDCSNPZODCMSMime: 'String',
          doPoPoPrZa: 'Base64',
          dannyeDovere: 'dannyeDovere'
        },
        dannyeDovere: {
          seria: 'String',
          numberDoc: 'String',
          dataStart: 'DateTime',
          dataEnd: 'DateTime',
          numberInRst: 'String'
        },
        kGKUTSSPN: {
          num: 'Integer',
          fullDescription: 'Integer',
          dictionaryCode: 'String',
          shortDescription: 'String',
          value: 'String',
          code: 'String'
        },
        personNew: {
          addressReg: 'address',
          dateOfBirth: 'DateTime',
          lastName: 'String',
          sex: 'String',
          dateOfPlace: 'DateTime',
          timeStamp: 'DateTime',
          patronName: 'String',
          isObjFixed: 'Boolean',
          tel: 'String',
          placeDoc: 'String',
          guid: 'String',
          systemClassCode: 'String',
          numberDoc: 'String',
          factAddrDiff: 'Boolean',
          typeDoc: 'Integer',
          seria: 'String',
          email: 'String',
          dateOfPlaceReg: 'DateTime',
          factAddr: 'address',
          ouid: 'Integer',
          snils: 'String',
          firstName: 'String',
          createDate: 'DateTime'
        },
        status: {
          id: 'Integer',
          guid: 'String',
          statusCode: 'String',
          name: 'String'
        },
        street: {
          guid: 'String',
          timeStamp: 'DateTime',
          commonAccess: 'Boolean',
          kladrCode: 'Integer',
          name: 'String',
          ouid: 'Integer',
          okatoCode: 'Integer',
          streetType: 'streetType'
        },
        streetType: {
          guid: 'String',
          timeStamp: 'DateTime',
          name: 'String',
          nameNakh: 'String',
          ouid: 'Integer'
        },
        country: {
          guid: 'String',
          num: 'Integer',
          timeStamp: 'DateTime',
          commonAccess: 'Boolean',
          name: 'String',
          dCodeOKSM: 'Integer',
          ouid: 'Integer',
          code: 'String'
        },
        subjectFederation: {
          guid: 'String',
          timeStamp: 'DateTime',
          commonAccess: 'Boolean',
          kladrCode: 'Integer',
          name: 'String',
          ouid: 'Integer',
          okatoCode: 'Integer',
          code: 'Integer',
          type: 'type',
          country: 'country'
        },
        type: {id: 'Integer', guid: 'Integer', name: 'String'},
        federalOkrug: {
          guid: 'String',
          timeStamp: 'DateTime',
          commonAccess: 'Boolean',
          name: 'String',
          ouid: 'Integer',
          code: 'Integer',
          country: 'country'
        },
        town: {
          guid: 'String',
          timeStamp: 'DateTime',
          commonAccess: 'Boolean',
          kladrCode: 'Integer',
          name: 'String',
          ouid: 'Integer',
          okatoCode: 'Integer',
          subjectFederal: 'subjectFederal',
          townType: 'townType',
          country: 'country'
        },
        subjectFederal: {
          guid: 'String',
          timeStamp: 'DateTime',
          commonAccess: 'Boolean',
          kladrCode: 'Integer',
          name: 'String',
          ouid: 'Integer',
          okatoCode: 'Integer',
          code: 'Integer',
          type: 'type',
          country: 'country'
        },
        townType: {
          guid: 'String',
          timeStamp: 'DateTime',
          nameNakh: 'String',
          name: 'String',
          ouid: 'Integer'
        },
        address: {
          building: 'String',
          actualKladrCode: 'Integer',
          timeStamp: 'DateTime',
          status: 'status',
          street: 'street',
          houseNumber: 'Integer',
          country: 'country',
          guid: 'String',
          subjectFederation: 'subjectFederation',
          federalOkrug: 'federalOkrug',
          utility: 'Integer',
          zipCode: 'String',
          ouid: 'Integer',
          town: 'town',
          flatNumber: 'Integer'
        },
        tsePreZemUch: {
          shortDescription: 'String',
          dictionaryCode: 'String',
          value: 'String',
          code: 'String'
        },
        state: {
          guid: 'String',
          systemClassCode: 'String',
          title: 'String',
          timeStamp: 'DateTime',
          ouid: 'Integer',
          code: 'Integer',
          createDate: 'DateTime'
        },
        typePet: {
          num: 'Integer',
          dictionaryCode: 'String',
          shortDescription: 'String',
          value: 'String',
          code: 'String'
        },
        sposPoluDoku: {
          dictionaryCode: 'String',
          shortDescription: 'String',
          value: 'String',
          code: 'String'
        },
        params: {
          guid: 'String',
          systemClassCode: 'String',
          timeStamp: 'DateTime',
          isObjFixed: 'Boolean',
          rebenok: 'personNew',
          rodstvSvyaz: 'rodstvSvyaz',
          ouid: 'Integer',
          createDate: 'DateTime'
        },
        rodstvSvyaz: {
          num: 'Integer',
          dictionaryCode: 'String',
          shortDescription: 'String',
          value: 'String',
          code: 'String'
        },
        federationBorough: {
          guid: 'String',
          timeStamp: 'DateTime',
          commonAccess: 'Boolean',
          name: 'String',
          kladrCode: 'Integer',
          ouid: 'Integer',
          federationSubjectID: 'federationSubjectID',
          okatoCode: 'Integer',
          type: 'type'
        },
        federationSubjectID: {
          guid: 'String',
          timeStamp: 'DateTime',
          commonAccess: 'Boolean',
          kladrCode: 'Integer',
          name: 'String',
          ouid: 'Integer',
          okatoCode: 'Integer',
          code: 'Integer',
          type: 'type',
          country: 'country'
        },
        boroughtSubFed: {
          guid: 'String',
          timeStamp: 'DateTime',
          commonAccess: 'Boolean',
          name: 'String',
          kladrCode: 'Integer',
          ouid: 'Integer',
          federationSubjectID: 'federationSubjectID',
          okatoCode: 'Integer',
          type: 'type'
        },
        mestZemeUcha: {
          guid: 'String',
          subjectFederation: 'subjectFederation',
          federationBorough: 'federationBorough',
          timeStamp: 'DateTime',
          distrTown: 'String',
          ouid: 'Integer',
          settlement: 'String',
          town: 'town',
          createDate: 'DateTime',
          country: 'country'
        },
        Result: {
          result: 'String'
        }
      },
      messages: {
        data: ['petitionSource'],
        result: ['Result']
      },
      operations: {
        accept: {
          input: 'data',
          output: 'result'
        }
      },
      style: 'document'
    };
  };
  /**
   * Создаёт заявление на портале многодетных, попутно создаёт все необходимые объекты на которые оно ссылается.
   * @param {Declaration} decl - объект заявления
   * @returns {Promise} Объект, типа String - id созданного заявления
   */
  function createDeclaration(decl) {
    return new Promise((resolve, reject)=> {
      if (typeof decl.dannyeZayavi === 'undefined' || decl.dannyeZayavi === 'null') {
        reject('Не указаны данные заявителя')
      }
      if (typeof decl.typePet === 'undefined' || decl.typePet === 'null') {
        if (typeof decl.typePet.code === 'undefined' || decl.typePet.code === 'null') {
          reject('Не указан вид заявления')
        }
      }
      if (typeof decl.tsePreZemUch === 'undefined' || decl.tsePreZemUch === 'null') {
        if (typeof decl.tsePreZemUch.code === 'undefined' || decl.tsePreZemUch.code === 'null') {
          reject('Не указана цель предоставления земельного участка')
        }
      }
      if (typeof decl.sposPoluDoku === 'undefined' || decl.sposPoluDoku === 'null') {
        if (typeof decl.sposPoluDoku.code === 'undefined' || decl.sposPoluDoku.code === 'null') {
          reject('Не указан способ получения документов')
        }
      }
      if (decl.pRZOVHKVTCVAR !== true) {
        reject('Не выбран пункт "Подтверждаю свое согласие, а также согласие членов многодетной семьи  на обработку' +
          ' персональных данных (сбор, систематизацию, накопление, хранение, уточнение (обновление, изменение),' +
          ' использование, распространение (в том числе передачу), обезличивание, блокирование, уничтожение' +
          ' персональных данных, а также иные действия, необходимые для обработки персональных данных в рамках' +
          ' предоставления земельных участков в собственность бесплатно на основании Закона Хабаровского края' +
          ' от 29 июля 2015 г. N 104 "О регулировании земельных отношений в Хабаровском крае", в том числе в' +
          ' автоматизированном режиме"')
      }
      if (decl.nFNMPZEDDISDS !== true) {
        reject('Не выбран пункт "Настоящим подтверждаю: - с порядком постановки на учет и предоставления в' +
          ' собственность бесплатно земельного участка ознакомлен(ы); - земельный участок в соответствии с' +
          ' Законом Хабаровского края от 29 июня 2011 г. N 100 "О бесплатном предоставлении в собственность' +
          ' гражданам, имеющим трех и более детей, земельных участков на территории Хабаровского края" или' +
          ' Законом Хабаровского края от 29 июля 2015 г. N 104 "О регулировании земельных отношений в' +
          ' Хабаровском крае" не получал(и) и на учете для получения такого земельного участка не состою(им);' +
          ' - все члены семьи являются гражданами Российской Федерации; - в отношении детей, указанных в заявлении,' +
          ' родительских прав не лишен(ы), усыновление (удочерение) не отменено; - сведения, включенные в заявление,' +
          ' внесенные мною, достоверны; - документы (копии документов), приложенные к заявлению, соответствуют' +
          ' требованиям, установленным законодательством Российской Федерации; на момент представления заявления' +
          ' эти документы действительны и содержат достоверные сведения"')
      }
      if (decl.oVNSPUOPUPMIV !== true) {
        reject('Не выбран пункт "Обязуюсь письменно сообщать об обстоятельствах, влекущих утрату права на' +
          ' приобретение земельного участка в собственность бесплатно в соответствии с Законом Хабаровского края' +
          ' от 29 июля 2015 г. N 104 "О регулировании земельных отношений в Хабаровском крае", с представлением' +
          ' подтверждающих документов, за исключением документов (их копий или содержащихся в них сведений),' +
          ' получаемых уполномоченным органом по учету посредством межведомственного информационного взаимодействия"');
      }
      return Promise.all([
          createFamily(decl),
          createPerson(decl.dannyeZayavi),
          createPerson(decl.dannPredZaya),
          createAddress(decl.adrePochOtpr),
          createAddress(decl.adNaRaVPoZa),
          createAddress(decl.aSSUPNRZUUONP),
          createLocationLand(decl.mestZemeUcha),
          createDocument(decl, 'kopiOrigZaya'),
          createDocument(decl, 'dokUdoLicRod'),
          createDocument(decl, 'sOROUND'),
          createDocument(decl, 'svOZarBr'),
          createDocument(decl, 'sDCSNPZODCMS'),
          createDocument(decl, 'dPOVUPNPZUVSB'),
          createDocument(decl, 'dPOVUPNPZUVSB'),
          createDocument(decl, 'doPoPoPrZa'),
          createAttornity(decl.dannyeDovere)
        ])
        .then((created) => {
          declTempl = {
            attorney: created[15],
            typePet: decl.typePet.code,
            fam: '',
            famNew: created[0],
            app: '',
            appNew: created[1],
            surety: decl.poDovere,
            decl: '',
            declNew: created[2],
            socNaim: decl.sPZPPDNZPZFSI,
            org: decl.orGoVlIlMeSa,
            target: decl.tsePreZemUch.code, //СЛОВАРЬ
            startArea: decl.startArea,
            endArea: decl.endArea,
            placeArea: created[6],
            delivPost: created[3], //TODO Создать АДРЕС!!!
            raspPost: created[4], //TODO Создать АДРЕС!!!
            rehPost: created[5], //TODO Создать АДРЕС!!!
            info: decl.proOsuDopInf,
            origPet: created[7], //Файл
            idDocParent: created[8], //Файл
            idDocChild: created[9], //Файл
            mariageScan: created[10], //Файл
            sign: created[11], //Файл
            missDoc: created[12], //Файл
            methodDelivery: 'd4460100-24a9-11e7-9bc0-afe22f2416d7', // Справочник
            delivery: 'd4460100-24a9-11e7-9bc0-afe22f2416d7',
            poNomeTele: decl.poNomeTele,
            poAdrElePoc: decl.poAdrElePoc,
            pRZOVHKVTCVAR: decl.pRZOVHKVTCVAR,
            nFNMPZEDDISDS: decl.nFNMPZEDDISDS,
            oVNSPUOPUPMIV: decl.oVNSPUOPUPMIV,
            dPOVUPNPZUVSB: created[13],//Файл
            doPoPoPrZa: created[14],//Файл
            idExtend: decl.guid,
            mFTS: decl.mFTS ? decl.mFTS.code : '', //Словарь
            kGKUTSSPN: decl.kGKUTSSPN ? decl.kGKUTSSPN.code : '', //Словарь\
            placePet: '' //Словарь
          };
          return dr.createItem('declaration@land-families-ru', declTempl)
            .then((createdDecl) => {
              resolve(createdDecl.id);
            });
        })
        .catch((err) => {
          reject(err)
        });
    })
  }

  function createAttornity(attorinty) {
    return new Promise((resolve, reject) => {
      var surety = {
        ser: attorinty.seria,
        num: attorinty.numberDoc,
        dateBegin: attorinty.dataStart,
        dateEnd: attorinty.dataEnd,
        reestrNum: attorinty.numberInRst,
        idExtend: attorinty.guid
      };
      dr.createItem('surety@land-families-ru', surety)
        .then((createdSurety) => {
          resolve(createdSurety.id);
        });
    });
  }
  /**
   * Ищет, а если не находит, создаёт объект региона.
   * @param {wmAddress} address - объект адреса.
   * @returns {Promise} Объект, типа Object - созданного или найденного района.
   */
  function findOrCreateRegion(address) {
    return new Promise((resolve, reject) => {
      try {
        var value = address.subjectFederation;
        if (typeof regions[value.name + ' ' + value.type.name] !== 'undefined') {
          resolve(regions[value.name + ' ' + value.type.name]);
        } else {
          var newRegion = {
            kod: +regions.last + 1,
            name: value.name,
            kladrcod: value.kladrCode
          };
          getDictionary('adressRegion@land-families-ru', 'name', 'kod')
            .then((dict) => {
              regions = dict;
              return dr.createItem('adressRegion@land-families-ru', newRegion)
            })
            .then((createdItem) => {
              resolve(createdItem.id);
            })
            .catch((err) => {
              reject(JSON.stringify(newDistrict, null, 2) + '\n' + JSON.stringify(err, null, 2));
            });
        }
      } catch (err) {
        console.log(err);
      }
    })
  }

  /**
   * Ищет, а если не находит, создаёт объект района.
   * @param {wmAddress} address - объект адреса.
   * @param {string} region - id региона, которому относится этот район.
   * @returns {Promise} Объект, типа Object - id созданного или найденного района.
   */
  function findOrCreateDistrict(address, region) {
    return new Promise((resolve, reject) => {
      try {
        var value = address.federationBorough;
        if (typeof districts[value.name + ' ' + value.type.name + '_' + region] !== 'undefined') {
          resolve(districts[value.name + ' ' + value.type.name + '_' + region]);
        } else {
          console.log('Район не найден, создаю новый' + value.name + ' ' + value.type.name);
          var newDistrict = {
            kod: +districts.last + 1,
            name: value.name + ' ' + value.type.name,
            region: region,
            kladrcod: value.kladrCode
          };

          getDictionary('adressDistrict@land-families-ru', ['name', 'region'], 'kod')
            .then((dict) => {
              districts = dict;
              return dr.createItem('adressDistrict@land-families-ru', newDistrict)
            })
            .then((createdItem) => {
              resolve(createdItem.id);
            })
            .catch((err) => {
              reject(JSON.stringify(newDistrict, null, 2) + '\n' + JSON.stringify(err, null, 2));
            });
        }
      } catch (err) {
        console.log(err);
      }
    })
  }

  /**
   * Ищет, а если не находит, создаёт объект города.
   * @param {wmAddress} address - объект адреса.
   * @param {string} district - id района, которому относится этот город.
   * @returns {Promise} Объект, типа Object - id созданного или найденного города.
   */
  async function findOrCreateTown(address, district) {
    try {
      towns = await getDictionary('adressTown@land-families-ru', ['name', 'okato'], 'kod');
      var value = address.town;
      if (typeof towns[[value.name + ' ' + value.townType.name, value.okatoCode].join('_')] !== 'undefined') {
        return(towns[[value.name + ' ' + value.townType.name, value.okatoCode].join('_')]);
      } else {
        console.log('Город не найден, создаю новый', value.name + ' ' + value.townType.name);
        var newTown = {
          kod: +towns.last + 1,
          name: value.name + ' ' + value.townType.name,
          district: district,
          okato: value.okatoCode,
          kladrcod: value.kladrCode
        };
        console.log(newTown.kod);
        return await dr.createItem('adressTown@land-families-ru', newTown);

      }
    } catch(err) {
      throw new Error('Ошибка при создании города' +
        JSON.stringify(newTown, null, 2) + '\n' + JSON.stringify(err, null, 2));
    }
  }

  /**
   * Ищет, а если не находит, создаёт объект улицы.
   * @param {wmAddress} address - объект адреса.
   * @param {string} town - id города, которому относится эта улица.
   * @returns {Promise} Объект, типа Object - id созданной или найденной улицы.
   */
  function findOrCreateStreet(address, town) {
    return new Promise((resolve, reject) => {
      try {
        var value = address.street;
        if (typeof streets[value.name + ' ' + value.streetType.name + '_' + town] !== 'undefined') {
          resolve(streets[value.name + ' ' + value.streetType.name + '_' + town]);
        } else {
          console.log('Улица не найдена, создаю новую');
          dr.createItem('adressStreet@land-families-ru', {
              kod: +streets.last + 1,
              name: value.name + ' ' + value.streetType.nameNakh,
              town: town,
              kladrcod: value.kladrCode
            })
            .then((createdItem) => {
              getDictionary('adressStreet@land-families-ru', ['name', 'town'], 'kod')
                .then((updatedDict) => {
                  streets = updatedDict;
                  resolve(createdItem.id);
                })
            })
            .catch((err) => {
              reject(err);
            });
        }
      } catch (err) {
        console.log(err);
      }
    })
  }

  /**
   * Ищет, а если не находит, создаёт родственную связь на проверке на проверке и персоны детей.
   * @param {relationChildNew} smvSprhbrLandFamdeti - родственная связь
   * @returns {Promise} Объект типа String - id созданной персоны на проверке
   */
  function createRelationChildNew(smvSprhbrLandFamdeti) {
    return new Promise((resolve, reject) => {
      createPerson(smvSprhbrLandFamdeti.rebenok)
        .then((createdChildId) => {
          relationChildNew = {
            reas: createdChildId,
            rods: smvSprhbrLandFamdeti.rodstvSvyaz.code,
            fam: '',
            idExtend: smvSprhbrLandFamdeti.guid
          };
          console.log('Создаю новую родственную связь ', relationChildNew.reas);
          dr.createItem('relationChildNew@land-families-ru', relationChildNew)
            .then((createdRelationChildNew) => {
              resolve(createdRelationChildNew.id);
            });
        })
        .catch((err) => {
          reject(err);
        })
    })
  }

  /**
   * Ищет, а если не находит создаёт персону на проверке на портале многодетных, заменяет параметры по справочнику.
   * @param {person} declPerson - персона заявления
   * @returns {Promise} Объект типа String - id созданной персоны на проверке
   */
  function createPerson(declPerson) {
    var sexRepl = {
      male: 'man',
      female: 'woman'
    };
    personNew = {
      famChilds: '',
      surname: declPerson.lastName,
      name: declPerson.firstName,
      patronymic: declPerson.patronName,
      dateBorn: declPerson.dateOfBirth,
      snils: declPerson.snils,
      postIndexAct: declPerson.addressReg.zipCode,
      regionAct: declPerson.addressReg.subjectFederation.name + ' ' + declPerson.addressReg.subjectFederation.type.name,
      districtAct: declPerson.addressReg.federationBorough ? declPerson.addressReg.federationBorough.name + ' ' +
      declPerson.addressReg.federationBorough.type.name : '',
      townAct: declPerson.addressReg.town.name + ' ' + declPerson.addressReg.town.townType.name,
      streetAct: declPerson.addressReg.street.name + ' ' + declPerson.addressReg.street.streetType.nameNakh,
      houseAct: declPerson.addressReg.houseNumber,
      flatAct: declPerson.addressReg.flatNumber,
      dateReg: declPerson.dateOfPlaceReg,
      postIndexFact: declPerson.factAddr.zipCode,
      regionFact: declPerson.factAddr.subjectFederation.name + ' ' + declPerson.factAddr.subjectFederation.type.name,
      districtFact: declPerson.factAddr.federationBorough ? declPerson.factAddr.federationBorough.name + ' ' +
      declPerson.factAddr.federationBorough.type.name : '',
      townFact: declPerson.factAddr.town.name + ' ' + declPerson.factAddr.town.townType.name,
      streetFact: declPerson.factAddr.street.name + ' ' + declPerson.factAddr.street.streetType.nameNakh,
      houseFact: declPerson.factAddr.houseNumber,
      flatFact: declPerson.factAddr.flatNumber,
      phone: declPerson.tel,
      email: declPerson.email,
      typeDoc: declPerson.typeDoc,
      ser: declPerson.seria,
      num: declPerson.numberDoc,
      date: declPerson.dateOfPlace,
      org: declPerson.placeDoc,
      famParentMale: '',
      famParentFemale: '',
      sex: sexRepl[declPerson.sex],
      idExtend: declPerson.guid
    };
    return new Promise((resolve, reject) => {
          console.log('Cоздаю новую персону ', personNew.surname + ' ' + personNew.name + ' ' +
            personNew.patronymic);
          return dr.createItem('personNew@land-families-ru', personNew)
            .then((createdPerson) => {
              resolve(createdPerson.id);
            })
            .catch((err) => {
              reject(err);
            });
    });
  }

  /**
   * Ищет, а если не находит создаёт семью на проверке. Поиск идёт по id матери и отца семьи.
   * @param {Declaration} decl - объект заявления
   * @returns {Promise} Объект типа String - id созданная семья на проверке
   */
  function createFamily(decl) {
    var familyNew = {};
    return new Promise((resolve, reject) => {
      if (typeof decl.dannyeMateri === 'undefined' || decl.dannyeMateri === 'null') {
        reject('Не указаны данные матери в семье')
      }
      if (typeof decl.dannyeOSeme === 'undefined' || decl.dannyeOSeme === 'null') {
        reject('Не указаны данные отца в семье')
      }
      if (typeof decl.deti === 'undefined' || decl.deti === 'null') {
        reject('Не указаны дети в семье')
      }
      return Promise.all([
          createPerson(decl.dannyeMateri),
          createPerson(decl.dannyeOSeme),
          Promise.all(
            decl.deti.map((item) => {
              return createRelationChildNew(item);
            })
          )
        ])
        .then((familyPerson) => {
          var familyNew = {
            oneParent: decl.odinRoditel,
            adoptive: decl.estUsynDeti,
            notMariage: decl.rastorBrak,
            mother: familyPerson[0],
            father: familyPerson[1],
            childs: familyPerson[2],
            idExtend: decl.guid
          };
          console.log('Cоздаю новую семью');
          return dr.createItem('familyNew@land-families-ru', familyNew)
            .then((familyNewItem) => {
              return Promise.all(familyPerson[2].map((itemId) => {
                  return dr.getItem('relationChildNew@land-families-ru', itemId)
                    .then((data) => {
                      data.fam = familyNewItem.id;
                      return dr.editItem('relationChildNew@land-families-ru', itemId, data);
                    });
                }))
                .then(() => {
                  resolve(familyNewItem.id);
                });
            })

        })
        .catch((err) => {
          reject(err);
        });
    })
  }

  /**
   * Созаёт объект адреса. //CHECKME Возможно стоит сделать справочник адресов и сначала искать в нём.
   * @param {wmAddres} declAddress - объект адреса
   * @returns {Promise} Объект типа String - id созданный адрес
   */
  function createAddress(declAddress) {
    return new Promise((resolve, reject) => {
      if (typeof declAddress === 'undefined' || declAddress === 'null') {
        resolve(null);
      } else {
        var rpguAddress = {
          postIndex: declAddress.postOffice,
          region: '',
          district: '',
          town: '',
          street: '',
          house: declAddress.houseNumber,
          building: declAddress.building,
          flat: declAddress.flatNumber,
          adressValue: '',
          map: '',
          idExtend: declAddress.guid
        };
        findOrCreateRegion(declAddress)
          .then((regionId) => {
            rpguAddress.region = regionId;
            if (declAddress.federationBorough) {
              return findOrCreateDistrict(declAddress, regionId);
            }
          })
          .then((districtId) => {
            if(districtId) {
              rpguAddress.district = districtId;
            }
            if (declAddress.town) {
              return findOrCreateTown(declAddress, districtId);
            } else {
              reject('Не указан город')
            }
          })
          .then((townId) => {
            rpguAddress.town = townId;
            if (declAddress.streetType) {
              return findOrCreateStreet(declAddress);
            }
          })
          .then((streetId) => {
            if(streetId) {
              rpguAddress.street = streetId;
            }
            dr.createItem('adress@land-families-ru', rpguAddress)
              .then((createdItem) => {
                resolve(createdItem.id);
              });
          })
          .catch((err) => {
            reject(err);
          });
      }
    })
  }

  /**
   * Ищет, а если не находит создаёт местоположение земельного участка
   * @param {wmAddress} declAddress - адресс земельного участка. Район, город, район города.
   * @returns {Promise} Объект, типа Object - id созданного местоположение земельного участка locationLand.
   */
  function createLocationLand(declAddress) {
    return new Promise((resolve, reject)=> {
      var locationLand = {
        district: '',
        town: '',
        ray: declAddress.distrTown,
        idExtend: declAddress.guid
      };
      if (typeof declAddress.subjectFederation === 'undefined') {
        reject('Не указан город в адресе участка');
      }
      findOrCreateRegion(declAddress)
        .then((regionId) => {
          if (declAddress.federationBorough) {
            return findOrCreateDistrict(declAddress, regionId);
          }
        })
        .then((districtId) => {
          if(districtId) {
            locationLand.district = districtId;
          }
          if (declAddress.town) {
            return findOrCreateTown(declAddress, locationLand.district)
          } else {
            reject('Не указан город в адресе участка');
          }
        })
        .then((townId) => {
          locationLand.town = townId;
          dr.createItem('locationLand@land-families-ru', locationLand)
            .then((createdLocationLand) => {
              resolve(createdLocationLand.id);
            });
        })
        .catch((err) => {
          reject(err)
        })
    });
  }

  /**
   * Создаёт словарь из полей класса name.
   * @param {string} name - имя класса из которого будет сделан справочник
   * @param {string[]} keys - массив названий атрибутов которые будут служить ключом. Атрибуты соединяются символом '_'
   * @param {string} value - значение которое соответствует ключу. Одно поле объекта
   * @returns {Promise} Объект, типа Object - созданный словарь.
   */
  function getDictionary(name, keys, value) {
    return new Promise((resolve, reject) => {
      if (typeof value === 'undefined') {
        reject('Не определён атрибут для значения');
      }
      if (typeof keys === 'undefined') {
        reject('Не определены атрибуты для ключей');
      }
      if (typeof keys === 'string') {
        keys = [keys];
      }
      if (typeof name === 'undefined') {
        reject('Не определено имя класса');
      }
      options.dataRepo.getList(name)
        .then((list) => {
          if (list.length > 0) {
            var dictionary = {};
            dictionary['last'] = list[list.length - 1].id;
            list.forEach((listElem) => {
              if (typeof listElem.base[value] === 'undefined') {
                reject('Нет ключа ' + value + ' ' + listElem.id + ' в классе ' + name);
              }
              var array = keys;
              array = array.map((key) => {
                if (typeof listElem.base[key] === 'undefined' || listElem.base[key] === null) {
                  return '';
                }
                return listElem.base[key].replace(/ {1,}/g, ' ');
              });
              if ((typeof dictionary[array.join('_')] !== 'undefined') && (blacklist.indexOf(array.join('_')) === -1)) {
                console.warn('Для класса ' + name + ' ' + listElem.id +
                  ' невозможно составить одноначный словарь, ключ не уникальный ' + array.join('_'));
              }
              dictionary[array.join('_')] = listElem.base[value];
            });
            return dictionary;
          } else {
            return null
          }
        })
        .then((resDict) => {
          resolve(resDict);
        })
        .catch((err) => {
          reject(err);
        });
    })
  }

  /**
   * Создаёт файл в коллекции файлов
   * @param {Declaration} declaration - объект заявления
   * @param {string} name - поле объекта в котором располагается документ
   * @returns {Promise} Объект, типа Object - id созданного файла.
   */
  function createDocument(declaration, name) {
    return new Promise((resolve, reject) => {
      if (typeof declaration[name] === 'undefined') {
        reject('Нет данных файла ' + name);
      }
      if (typeof declaration[name + 'Name'] === 'undefined') {
        reject('Нет имени файла');
      }
      if (typeof declaration[name + 'Size'] === 'undefined') {
        reject('Нет размера файла');
      }
      rs.accept(declaration[name], null, {
          mime: declaration[name + 'Mime'], size: declaration[name + 'Size'],
          date: declaration[name + 'Date'], name: declaration[name + 'Name'], check: declaration[name + 'Check']
        })
        .then((createdFile) => {
          resolve(createdFile.id);
        });
    });
  }

//Справочники
  var regions = {};
  var districts = {};
  var towns = {};
  var streets = {};

  function getDictionaries() {
    return new Promise((resolve, reject)=> {
      Promise.all([
          getDictionary('adressRegion@land-families-ru', 'name', 'kod'),
          getDictionary('adressDistrict@land-families-ru', ['name', 'region'], 'kod'),
          getDictionary('adressTown@land-families-ru', ['name', 'okato'], 'kod'),
          getDictionary('adressStreet@land-families-ru', ['name', 'town'], 'kod')
        ])
        .then((resultDict) => {
          function normalize(input) {
            var result = {};
            for (var key in input) {
              if(input.hasOwnProperty(key)){
                var val  = input[key];
                var key2 = key;
                key2 = key2.replace(/ {1,}/g, ' ');
                key2 = key2.replace(/- /g, '-');
                key2 = key2.replace(/ -/g, '-');
                result[key2] = val;
              }
            }
            return result;
          }
          regions = resultDict[0];
          districts = resultDict[1];
          towns = resultDict[2];
          streets = resultDict[3];
          resolve('Словари сервиса готовы');
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  /*
   * Эта переменная - промис, который выполняется при запуске сервиса, он готовит все справочники, а после считается выполненным.
   * */
  var dict = getDictionaries()
    .then((message) => {
      console.log(message);
    })
    .catch((err) => {
      console.warn(err);
    });
  /**
   * Функция принимает заявление. Возварщает клиенту сервиса id заявления в реестре многодетных
   * или ошибку. Так же пишет ошибку в консоль.
   * @param {Declaration} declaration - объект заявления
   * @return {Promise} Объект типа string, id созданного заявления
   */
  this.accept = function (declaration) {
    return dict
      .then(() => {
        return createDeclaration(declaration);
      })
      .then((declId) => {
        return {result: declId.toString()};
      })
      .catch((err) => {
        console.log(err);
        return {result: err};
      });
  };
}

module.exports = ChildzemService;
