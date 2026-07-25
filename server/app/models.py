from sqlmodel import SQLModel, Field
from datetime import datetime, date, timezone
from enum import Enum
import uuid

# makes a random uuid
def uid() -> str:
    return str(uuid.uuid4())

# returns the current datetime when item is created
def nowUtc() -> datetime:
    return datetime.now(timezone.utc)

# for status in plaid item
class Status(str, Enum):
    active = "active"
    loginReq = "login_required"
    error = "error"

# for type in accounts
class Type(str,Enum):
    checking = "checking"
    saving = "saving"
    credit = "credit"

# better auth defines the user tables so they are referenced and used here but not defined in the models.py file

# each persons profile
class Profiles(SQLModel, table = True):
    __tablename__ = "profiles"
    id: str = Field(default_factory = uid,primary_key = True)
    userId: str = Field(index = True,unique = True) # this is where better auth points to
    timezone: str = Field(default = "America/Toronto")
    themeId: str = Field(default = "midnight")
    createdAt: datetime = Field(default_factory = nowUtc)

# each transaction or "item" in plaid
class PlaidItem(SQLModel, table=True):
    __tablename__ = "plaiditem"
    id: str = Field(default_factory = uid,primary_key = True)
    userId: str = Field(index = True)
    accessTokenEncrypted: str
    itemId: str = Field(index = True,unique = True)
    instituionName: str | None = Field(default = None) # nullable
    status: Status
    createdAt: datetime = Field(default_factory = nowUtc)

# connection to bank (shows credit, chequing, savings etc)
class Accounts(SQLModel, table = True):
     __tablename__ = "accounts"
     id: str = Field(default_factory = uid,primary_key = True)
     userId: str = Field(index = True)
     plaidItemId: str = Field(foreign_key = "plaiditem.id")
     plaidAccountId: str = Field(unique = True, index = True)
     name: str
     type: Type
     currentBalanceToCent: int
     createdAt: datetime = Field(default_factory = nowUtc)

# transactions table
class Transactions(SQLModel, table = True):
    __tablename__ = "transactions"
    id: str = Field(default_factory = uid,primary_key = True)
    userId: str = Field(index = True)
    accountId: str = Field(foreign_key = "accounts.id", index = True)
    plaidTransactionId:  str | None = Field(default = None, index = True, unique = True) # nullable
    dateOf: date = Field(index=True)
    amountToCent: int # money in = positive, money out = negative
    merchantName: str  | None = Field(default=None) # nullable
    category: str  |  None = Field(default=None) # nullable
    pending: bool = Field(default=False)
    isAnomaly: bool = Field(default=False)
    isManual: bool = Field(default=False)
    createdAt: datetime = Field(default_factory = nowUtc)

# saving goals set by user
class Bucket(SQLModel, table = True):
    __tablename__ = "bucket"
    id: str = Field(default_factory = uid, primary_key = True)
    userId: str = Field(index = True)
    name: str
    targetToCent: int
    currentToCent: int
    targetDate: date |  None = Field(default=None) # nullable
    createdAt: datetime = Field(default_factory = nowUtc)


     

     
