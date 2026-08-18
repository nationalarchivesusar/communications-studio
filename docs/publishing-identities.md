# Communications Studio publishing identities

This document is the canonical access-policy design for Communications Studio.

## Discord guild

Communications Studio is scoped to the United States of America Roblox Discord server:

- Guild ID: `886068973886640129`

Discord role-based authorization is evaluated only against this guild.

## General rules

- Production users see only publishing identities for which the backend currently authorizes them.
- Builder Preview intentionally exposes the complete identity catalog.
- Discord is the primary Studio login. Roblox is linked to the Studio account for Roblox group/rank authorization.
- FEC and NARA are authorized by Discord server roles rather than Roblox ranks.
- `FederalOversight`, `Clerk of America`, `Founder`, `Founders`, `Group Management`, `Development`, and `Developer` are not automatically treated as publishing authority.
- MPD is organized under the DOJ section of Communications Studio.
- DCFEMS and USCG are organized under DHS.
- DCNG is organized under DoD / United States Military.
- There is no separate generic `United States Congress` identity; House and Senate are the congressional identities.
- NSC, White House Medical Unit, ATF, Bureau of Intelligence & Research, Bureau of Consular Affairs, Department of Commerce & Labor identities, Supreme Court Police, and municipal/DC-government identities are intentionally omitted.

## White House

| Identity | Roblox group | Authorized ranks |
|---|---:|---|
| The White House | 6121205 | White House Press Office; White House Communications Office; Executive Office of the President; Deputy Chief of Staff; Principal Deputy Chief of Staff; White House Chief of Staff; Vice President; President |
| Executive Office of the President | 12291969 | White House Chief of Staff; Vice President; President |
| Office of the Vice President | 12711997 | Office of Communications; Deputy Vice President's Chief of Staff; Vice President's Chief of Staff; Vice President |
| White House Military Office | 16903930 | White House Military Office Staff; Chief of Staff; Deputy Director; Director |

## Department of Justice

| Identity | Roblox group | Authorized ranks |
|---|---:|---|
| Department of Justice | 6071470 | Office of the Attorney General; Chief of Staff; Associate Attorney General; Deputy Attorney General; Attorney General |
| Federal Bureau of Investigation | 6057701 | Executive Assistant Director; Associate Deputy Director; Chief of Staff; Deputy Director; Director |
| United States Marshals Service | 6435281 | Executive Staff; Chief of Staff; Deputy Director; Director |
| Metropolitan Police Department | 6150285 | Administrative Office; Assistant Chief of Police; Executive Assistant Chief of Police; Chief of Police |

## Department of Homeland Security

| Identity | Roblox group | Authorized ranks |
|---|---:|---|
| Department of Homeland Security | 6057710 | Federal Communications Center; Chief of Staff; Executive Secretary; Deputy Secretary; Secretary |
| United States Secret Service | 6057741 | Executive Staff; Chief of Staff; Chief Operating Officer; Deputy Director; Director |
| Federal Protective Service | 6071521 | Chief of Staff; Deputy Director; Director |
| Homeland Security Investigations | 34332513 | Assistant Director; Deputy Executive Associate Director; Executive Associate Director |
| DHS Office of Inspector General | 34160617 | Chief of Staff; Principal Deputy Inspector General; Inspector General |
| District of Columbia Fire and EMS | 13216655 | Battalion Chief; Assistant Chief; Deputy Chief; Fire & EMS Chief |
| United States Coast Guard | 13618143 | Coast Guard Headquarters; Vice Commandant of the Coast Guard; Commandant of the Coast Guard |

## Department of State

| Identity | Roblox group | Authorized ranks |
|---|---:|---|
| Department of State | 6121404 | Chief of Staff to the Secretary; Under Secretary of State; Deputy Secretary of State; Secretary of State |
| Diplomatic Security Service | 13705890 | Senior Coordinator for Diplomatic Security; Deputy Director; Director; Assistant Secretary of State for Diplomatic Security |

## Department of Defense / United States Military

| Identity | Roblox group | Authorized ranks |
|---|---:|---|
| Department of Defense | 6057831 | Press Secretary; Executive Secretary of Defense; Office of the Secretary of Defense; Deputy Secretary of Defense; Secretary of Defense |
| United States Military | 12924310 | [JCS]; [VCJCS]; [CJCS]; [DOD]; [DEPSECDEF]; [SECDEF]; [CIC] |
| District of Columbia National Guard | 13150677 | Joint Force Headquarters; Adjutant General; Commanding General |
| United States Army | 6120499 | Army Headquarters; Vice Chief of Staff of the Army; Chief of Staff of the Army; Secretary of the Army |
| United States Navy | 12906320 | OPNAV; Vice Chief of Naval Operations; Chief of Naval Operations; Secretary of the Navy |
| United States Air Force | 12906344 | Air Force Headquarters; Vice Chief of Staff of the Air Force; Chief of Staff of the Air Force; Secretary of the Air Force |
| United States Marine Corps | 8398256 | Marine Corps Headquarters; Assistant Commandant of the Marine Corps; Commandant of the Marine Corps; Secretary of the Navy |
| United States Special Operations Command | 33645084 | Command Staff; Vice Commander; Deputy Commander; Commander |
| Defense Intelligence Agency | 6606946 | Chief of Staff; Deputy Director; Director |
| National Security Agency | 6150413 | Chief of Staff; Deputy Director; Director |
| Pentagon Force Protection Agency | 34660545 | Executive Director; Deputy Director; Director |
| Defense Criminal Investigative Service | 13770277 | Assistant Director; Deputy Director; Director |
| Department of Defense Office of Inspector General | 16141692 | Chief of Staff; Deputy Inspector General; Inspector General |

## Intelligence Community

| Identity | Roblox group | Authorized ranks |
|---|---:|---|
| Office of the Director of National Intelligence | 6150704 | Press Secretary; Deputy Director of National Intelligence; Director of Intelligence Staff; Principal Deputy Director of National Intelligence; Director of National Intelligence |
| Central Intelligence Agency | 6150156 | Chief of Staff; Associate Deputy Director; Deputy Director; Director |

DIA and NSA are represented under the Defense section and are not duplicated as separate identity records.

## Congress

| Identity | Roblox group | Authorized ranks |
|---|---:|---|
| United States House of Representatives | 6057804 | Minority Leader; Majority Leader; Sergeant at Arms of the House; Clerk of the House; Speaker Pro Tempore; Speaker of the House |
| United States Senate | 6057814 | Sergeant at Arms of the Senate; Minority Leader; Secretary of the Senate; Majority Leader; President Pro Tempore of the Senate; President of the Senate |
| United States Capitol Police | 13216797 | Office of the Chief; Deputy Chief of Police; Assistant Chief of Police; Chief of Police; Capitol Police Board |
| United States Capitol Police — Office of Inspector General | 13216797 | Inspector General |

## Judiciary

| Identity | Roblox group | Authorized ranks |
|---|---:|---|
| United States Courts / Federal Judiciary | 6071495 | Court Clerk; Chief Judge; Chief Justice |
| Supreme Court of the United States | 6071495 | Clerks of the Supreme Court; Associate Justices of the Supreme Court; Chief Justice |

## Discord-role-controlled identities

These identities do not use Roblox group rank authorization.

### Federal Election Commission

Authorized Discord roles in guild `886068973886640129`:

- `1459393135175270593`
- `1031740186750636042`

### National Archives and Records Administration

Authorized Discord roles in guild `886068973886640129`:

- `1089923208079220797`

## Enforcement

The browser is not the security boundary. The backend must recompute current Discord roles and current Roblox group roles before returning identities and again before publishing. A hidden/disabled frontend option is not sufficient authorization.
