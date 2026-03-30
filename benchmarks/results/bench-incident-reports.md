## Incident Reports

> 300 rows, ~45% resolution with 4+ depth escalation

### Token Comparison

| Format | Tokens | vs JSON compact |
|--------|--------|-----------------|
| JSON pretty | 38,201 | +35.0% |
| JSON compact | 28,291 | baseline |
| TOON | 30,622 | +8.2% |
| **TOON (normalized)** | **21,531** | **-23.9%** |

### Normalized Structure

```
incidents[300]{incidentId,title,severity,status,reporter,createdAt}
incidents.resolution[122]{idx,assignee,rootCause,timeline.acknowledgedAt,timeline.resolvedAt,timeline.escalation.level,timeline.escalation.approvedBy,timeline.escalation.reason}
```

### TOON Normalized (first 20 lines)

```
incidents[300]{incidentId,title,severity,status,reporter,createdAt}:
  INC-0001,Centum xiphias officia stabilis statim tutis.,P1,open,Harold29@hotmail.com,"2026-03-03T03:52:13.189Z"
  INC-0002,Coniecto utilis admitto doloremque dens.,P4,investigating,Bella88@gmail.com,"2026-03-05T20:46:23.562Z"
  INC-0003,Surculus agnitio officiis dens voluptatum.,P4,investigating,Araceli.Reichel@yahoo.com,"2026-02-03T05:42:03.382Z"
  INC-0004,Venio mollitia tardus tantum armarium asper aeneus comitatus.,P2,closed,Connor35@hotmail.com,"2026-02-20T23:08:45.590Z"
  INC-0005,Admoveo aeternus accusator correptius tamen at.,P3,investigating,Judy18@yahoo.com,"2026-03-11T05:20:35.005Z"
  INC-0006,Amaritudo vere distinctio cum odit aurum.,P1,investigating,Justine.Wilderman@gmail.com,"2026-02-06T19:38:29.169Z"
  INC-0007,Vesica allatus desolo defleo cunae truculenter creator.,P1,open,Conner_Funk@gmail.com,"2026-02-18T06:02:06.624Z"
  INC-0008,Curso cruciamentum delectus aestus ipsum compono animus deleniti.,P1,investigating,Telly.Gottlieb43@gmail.com,"2026-03-12T01:43:47.738Z"
  INC-0009,Enim sodalitas comburo sumo voluptates.,P4,investigating,Blanca2@gmail.com,"2026-03-12T15:35:45.251Z"
  INC-0010,Eaque communis qui aliquam quas.,P2,open,Barry_Buckridge49@hotmail.com,"2026-03-06T11:02:28.218Z"
  INC-0011,Balbus unus conicio vindico aequitas depereo patria.,P1,closed,Jensen31@hotmail.com,"2026-03-25T20:50:25.341Z"
  INC-0012,Comis arto dolorem cresco artificiose valeo vulariter modi.,P4,closed,Barbara.Huel@yahoo.com,"2026-02-14T10:44:35.202Z"
  INC-0013,Turbo virtus sumptus tabella.,P4,open,Foster_Mraz@yahoo.com,"2026-02-24T02:07:23.773Z"
  INC-0014,Custodia commemoro suffoco usus.,P4,resolved,Bert_Erdman@gmail.com,"2026-02-19T08:04:38.324Z"
  INC-0015,Adversus optio viridis cedo ver virga censura.,P4,open,Nicolas57@yahoo.com,"2026-03-19T10:12:41.757Z"
  INC-0016,Aut strenuus venio ascit aiunt taceo.,P2,resolved,Kathleen.Stroman24@yahoo.com,"2026-02-24T13:45:46.040Z"
  INC-0017,Ulciscor compello conforto vehemens cursim testimonium.,P1,closed,Jerome.Beahan44@hotmail.com,"2026-03-13T20:21:38.635Z"
  INC-0018,Surculus creptio aer tonsor.,P3,open,Norma_Berge31@yahoo.com,"2026-03-01T00:17:32.092Z"
  INC-0019,Tener mollitia cursim tam.,P4,open,Ian_Rutherford42@gmail.com,"2026-03-08T10:16:47.041Z"
...
```


### Sample Data (5 rows)

<details>
<summary><strong>JSON (source)</strong></summary>

```json
{
  "incidents": [
    {
      "incidentId": "INC-0001",
      "title": "Virga synagoga patruus armarium armarium.",
      "severity": "P1",
      "status": "closed",
      "reporter": "Warren.Deckow@hotmail.com",
      "createdAt": "2026-02-23T23:23:15.872Z"
    },
    {
      "incidentId": "INC-0002",
      "title": "Perspiciatis apud claro copiose defleo.",
      "severity": "P4",
      "status": "open",
      "reporter": "Lester_White80@hotmail.com",
      "createdAt": "2026-02-03T22:02:05.468Z",
      "resolution": {
        "assignee": "Kathleen_Gerlach@yahoo.com",
        "rootCause": "memory_leak",
        "timeline": {
          "acknowledgedAt": "2026-03-05T14:28:55.891Z",
          "resolvedAt": "2026-03-29T14:26:14.035Z"
        }
      }
    },
    {
      "incidentId": "INC-0003",
      "title": "Vigor varius patrocinor verus alienus autus adipisci.",
      "severity": "P2",
      "status": "investigating",
      "reporter": "Ed98@gmail.com",
      "createdAt": "2026-02-09T23:32:15.221Z"
    },
    {
      "incidentId": "INC-0004",
      "title": "Tot suffragium suspendo tepidus.",
      "severity": "P1",
      "status": "investigating",
      "reporter": "Erwin63@gmail.com",
      "createdAt": "2026-02-26T09:22:35.027Z",
      "resolution": {
        "assignee": "Kelli.Ledner2@gmail.com",
        "rootCause": "config_error",
        "timeline": {
          "acknowledgedAt": "2026-03-19T03:36:08.477Z",
          "resolvedAt": "2026-03-19T18:33:18.364Z",
          "escalation": {
            "level": 3,
            "approvedBy": "Harry16@hotmail.com",
            "reason": "Required infrastructure team"
          }
        }
      }
    },
    {
      "incidentId": "INC-0005",
      "title": "Recusandae ut thymbra audentia vapulus fugit timor vel.",
      "severity": "P2",
      "status": "open",
      "reporter": "Sabrina.Johnson@gmail.com",
      "createdAt": "2026-03-26T15:10:36.290Z"
    }
  ]
}
```

</details>

<details>
<summary><strong>TOON (before)</strong></summary>

```
incidents[5]:
  - incidentId: INC-0001
    title: Virga synagoga patruus armarium armarium.
    severity: P1
    status: closed
    reporter: Warren.Deckow@hotmail.com
    createdAt: "2026-02-23T23:23:15.872Z"
  - incidentId: INC-0002
    title: Perspiciatis apud claro copiose defleo.
    severity: P4
    status: open
    reporter: Lester_White80@hotmail.com
    createdAt: "2026-02-03T22:02:05.468Z"
    resolution:
      assignee: Kathleen_Gerlach@yahoo.com
      rootCause: memory_leak
      timeline:
        acknowledgedAt: "2026-03-05T14:28:55.891Z"
        resolvedAt: "2026-03-29T14:26:14.035Z"
  - incidentId: INC-0003
    title: Vigor varius patrocinor verus alienus autus adipisci.
    severity: P2
    status: investigating
    reporter: Ed98@gmail.com
    createdAt: "2026-02-09T23:32:15.221Z"
  - incidentId: INC-0004
    title: Tot suffragium suspendo tepidus.
    severity: P1
    status: investigating
    reporter: Erwin63@gmail.com
    createdAt: "2026-02-26T09:22:35.027Z"
    resolution:
      assignee: Kelli.Ledner2@gmail.com
      rootCause: config_error
      timeline:
        acknowledgedAt: "2026-03-19T03:36:08.477Z"
        resolvedAt: "2026-03-19T18:33:18.364Z"
        escalation:
          level: 3
          approvedBy: Harry16@hotmail.com
          reason: Required infrastructure team
  - incidentId: INC-0005
    title: Recusandae ut thymbra audentia vapulus fugit timor vel.
    severity: P2
    status: open
    reporter: Sabrina.Johnson@gmail.com
    createdAt: "2026-03-26T15:10:36.290Z"
```

</details>

<details>
<summary><strong>TOON normalized (after)</strong></summary>

```
incidents[5]{incidentId,title,severity,status,reporter,createdAt}:
  INC-0001,Virga synagoga patruus armarium armarium.,P1,closed,Warren.Deckow@hotmail.com,"2026-02-23T23:23:15.872Z"
  INC-0002,Perspiciatis apud claro copiose defleo.,P4,open,Lester_White80@hotmail.com,"2026-02-03T22:02:05.468Z"
  INC-0003,Vigor varius patrocinor verus alienus autus adipisci.,P2,investigating,Ed98@gmail.com,"2026-02-09T23:32:15.221Z"
  INC-0004,Tot suffragium suspendo tepidus.,P1,investigating,Erwin63@gmail.com,"2026-02-26T09:22:35.027Z"
  INC-0005,Recusandae ut thymbra audentia vapulus fugit timor vel.,P2,open,Sabrina.Johnson@gmail.com,"2026-03-26T15:10:36.290Z"
incidents.resolution[2]{idx,assignee,rootCause,timeline.acknowledgedAt,timeline.resolvedAt,timeline.escalation.level,timeline.escalation.approvedBy,timeline.escalation.reason}:
  1,Kathleen_Gerlach@yahoo.com,memory_leak,"2026-03-05T14:28:55.891Z","2026-03-29T14:26:14.035Z",null,null,null
  3,Kelli.Ledner2@gmail.com,config_error,"2026-03-19T03:36:08.477Z","2026-03-19T18:33:18.364Z",3,Harry16@hotmail.com,Required infrastructure team
```

</details>
