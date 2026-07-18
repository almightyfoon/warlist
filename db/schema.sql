CREATE TABLE IF NOT EXISTS google_login (
    uid       INT          NOT NULL AUTO_INCREMENT,
    gid       VARCHAR(64)  NOT NULL,
    email     VARCHAR(255) NOT NULL DEFAULT '',
    name      VARCHAR(255) NOT NULL DEFAULT '',
    pic       TEXT         NOT NULL DEFAULT (''),
    PRIMARY KEY (uid),
    UNIQUE KEY uq_gid (gid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS folders (
    uid     INT          NOT NULL AUTO_INCREMENT,
    name    VARCHAR(255) NOT NULL DEFAULT '',
    owner   INT          NOT NULL,
    parent  INT          NULL,
    special TINYINT      NOT NULL DEFAULT 0,
    PRIMARY KEY (uid),
    KEY idx_owner (owner),
    CONSTRAINT fk_folder_owner FOREIGN KEY (owner) REFERENCES google_login(uid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS saved_lists (
    uid         INT          NOT NULL,
    offset_idx  INT          NOT NULL,
    description VARCHAR(255) NOT NULL DEFAULT '',
    listdata    MEDIUMTEXT   NOT NULL,
    folder      INT          NULL,
    PRIMARY KEY (uid, offset_idx),
    CONSTRAINT fk_list_owner FOREIGN KEY (uid) REFERENCES google_login(uid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS blog (
    uid       INT          NOT NULL AUTO_INCREMENT,
    post_type VARCHAR(32)  NOT NULL DEFAULT '',
    posted    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    title     VARCHAR(255) NOT NULL DEFAULT '',
    post_text TEXT         NOT NULL,
    PRIMARY KEY (uid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS events (
    uid        INT          NOT NULL AUTO_INCREMENT,
    name       VARCHAR(255) NOT NULL DEFAULT '',
    cover      TEXT         NOT NULL DEFAULT (''),
    inset      TEXT         NOT NULL DEFAULT (''),
    url        VARCHAR(512) NOT NULL DEFAULT '',
    address    VARCHAR(512) NOT NULL DEFAULT '',
    venue_name VARCHAR(255) NOT NULL DEFAULT '',
    PRIMARY KEY (uid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tournaments (
    uid       INT      NOT NULL AUTO_INCREMENT,
    startdate DATE     NULL,
    jsondata  LONGTEXT NOT NULL,
    approved  TINYINT  NOT NULL DEFAULT 0,
    PRIMARY KEY (uid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS venue (
    uid       INT            NOT NULL AUTO_INCREMENT,
    name      VARCHAR(255)   NOT NULL DEFAULT '',
    link      VARCHAR(512)   NOT NULL DEFAULT '',
    picture   TEXT           NOT NULL DEFAULT (''),
    cover     TEXT           NOT NULL DEFAULT (''),
    address   VARCHAR(512)   NOT NULL DEFAULT '',
    city      VARCHAR(128)   NOT NULL DEFAULT '',
    state     VARCHAR(128)   NOT NULL DEFAULT '',
    street    VARCHAR(255)   NOT NULL DEFAULT '',
    zip       VARCHAR(32)    NOT NULL DEFAULT '',
    country   VARCHAR(128)   NOT NULL DEFAULT '',
    latitude  DECIMAL(10,7)  NULL,
    longitude DECIMAL(10,7)  NULL,
    slug      VARCHAR(255)   NOT NULL DEFAULT '',
    PRIMARY KEY (uid),
    UNIQUE KEY uq_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS atc (
    uid       INT          NOT NULL AUTO_INCREMENT,
    regcode   VARCHAR(64)  NOT NULL DEFAULT '',
    team_name VARCHAR(255) NOT NULL DEFAULT '',
    jsondata  LONGTEXT     NOT NULL DEFAULT ('{}'),
    PRIMARY KEY (uid),
    UNIQUE KEY uq_regcode (regcode)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS players (
    uid          INT          NOT NULL AUTO_INCREMENT,
    event_uid    INT          NOT NULL,
    team_index   INT          NOT NULL,
    player_index INT          NOT NULL,
    name         VARCHAR(255) NOT NULL DEFAULT '',
    list         TEXT         NOT NULL DEFAULT (''),
    PRIMARY KEY (uid),
    UNIQUE KEY uq_slot (event_uid, team_index, player_index)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
