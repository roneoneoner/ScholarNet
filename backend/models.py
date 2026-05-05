from sqlalchemy import Column, Integer, Float, String
from database import Base

class AuthorHIndex(Base):
    __tablename__ = "author_id_h_index"
    __table_args__ = {"schema": "dbo"}
    author_id = Column(String(50), primary_key=True, index=True, autoincrement=False)
    h_index = Column(Float, nullable=True)

class AuthorInfo(Base):
    __tablename__ = "data_author_name_aff_country"
    __table_args__ = {"schema": "dbo"}
    author_id = Column(String(50), primary_key=True, index=True, autoincrement=False)
    surname = Column(String, nullable=True)
    given_name = Column(String, nullable=True)
    ip_doc_parent_preferred_name = Column(String, nullable=True)
    ip_doc_address_city = Column(String, nullable=True)
    ip_doc_address_country = Column(String, nullable=True)

class PaperAuthor(Base):
    __tablename__ = "data_author_scopusid_all"
    __table_args__ = {"schema": "dbo"}
    scopus_id = Column(String(255), primary_key=True, index=True)
    author_id = Column(String(50), primary_key=True, index=True, autoincrement=False)

class PaperSJR(Base):
    __tablename__ = "data_Paper_SJR_Best_Quartile"
    __table_args__ = {"schema": "dbo"}
    scopus_id = Column(String(255), primary_key=True, index=True)
    publicationName = Column(String, nullable=True)
    citedby_count = Column(Integer, nullable=True)
    SJR_Best_Quartile = Column(String(10), nullable=True)

class PaperDetail(Base):
    __tablename__ = "data_paper_type_cite_date"
    __table_args__ = {"schema": "dbo"}
    scopus_id = Column(String(255), primary_key=True, index=True)
    cover_date = Column(String, nullable=True)
    subtype_description = Column(String, nullable=True)
    source_type = Column(String, nullable=True)