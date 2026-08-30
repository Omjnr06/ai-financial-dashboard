from sqlmodel import SQLModel, Field
from sqlalchemy import Column, Enum as SAEnum
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
class AccountType(str, Enum):
    spending = "spending"
    credit = "credit"
    savings = "savings"
    investment = "investment"
    loan = "loan"

# for income source frequency
class IncomeFrequency(str, Enum):
    weekly = "weekly"
    biweekly = "biweekly"
    monthly = "monthly"
# better auth defines the user tables so they are referenced and used here but not defined in the models.py file

# each persons profile
class Profiles(SQLModel, table = True):
    __tablename__ = "profiles"
    id: str = Field(default_factory = uid,primary_key = True)
    userId: str = Field(index = True,unique = True) # this is where better auth points to
    timezone: str = Field(default = "America/Toronto")
    layoutId: str = Field(default="horizontal")
    themeId: str = Field(default = "midnight")
    createdAt: datetime = Field(default_factory = nowUtc)

# each bank connection in plaid
class PlaidItem(SQLModel, table=True):
    __tablename__ = "plaiditem"
    id: str = Field(default_factory = uid,primary_key = True)
    userId: str = Field(index = True)
    accessTokenEncrypted: str
    itemId: str = Field(index = True,unique = True)
    institutionName: str | None = Field(default = None) # nullable
    status: Status = Field(sa_column=Column(SAEnum(Status, values_callable=lambda e: [m.value for m in e]))) # neon mistakenly reading labels instead of values, updated so value passed not label
    cursor: str | None = Field(default=None)
    lastSyncedAt: datetime | None = Field(default=None)
    createdAt: datetime = Field(default_factory = nowUtc)

#  Connection to bank wrapper for our app (shows credit, chequing, savings etc)
class Accounts(SQLModel, table = True):
     __tablename__ = "accounts"
     id: str = Field(default_factory = uid,primary_key = True)
     userId: str = Field(index = True)
     plaidItemId: str = Field(foreign_key = "plaiditem.id")
     plaidAccountId: str = Field(unique = True, index = True)
     name: str
     accountType: AccountType
     plaidType: str | None = Field(default=None)
     plaidSubtype: str | None = Field(default=None)
     currentBalanceToCent: int
     availableBalanceToCent: int | None = Field(default=None)
     limitToCent: int | None = Field(default=None)
     safeToSpendThresholdCent: int = Field(default=0)
     createdAt: datetime = Field(default_factory = nowUtc)

# transactions table
class Transactions(SQLModel, table = True):
    __tablename__ = "transactions"
    id: str = Field(default_factory = uid,primary_key = True)
    userId: str = Field(index = True)
    accountId: str = Field(foreign_key = "accounts.id", index = True)
    plaidTransactionId:  str | None = Field(default = None, index = True, unique = True) # nullable
    dateOf: date = Field(index=True)
    amountToCent: int # money in = negative, money out = positive based on plaid
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
    accountId: str | None = Field(default=None, foreign_key = "accounts.id", index = True)
    name: str
    targetToCent: int
    currentToCent: int
    targetDate: date |  None = Field(default=None) # nullable
    createdAt: datetime = Field(default_factory = nowUtc)

class Bills(SQLModel,table = True):
    __tablename__= "bills"
    id: str = Field(default_factory = uid, primary_key = True)
    userId: str = Field(index = True)
    accountId: str | None = Field(default=None, foreign_key = "accounts.id", index = True)
    streamId: str | None = Field(default=None, index = True, unique = True)
    userModified: bool = Field(default=False)
    reviewed: bool = Field(default=False)
    dismissed: bool = Field(default=False)
    rawName: str | None = Field(default=None)
    name: str
    amountToCent: int
    dueDay: int # day of the month from 1 - 31
    isAuto: bool = Field(default=False)
    active: bool = Field(default=True)
    createdAt: datetime = Field(default_factory = nowUtc)

# a recurring income stream (manual entry baseline; plaid inflow detection can pre-fill later)
class IncomeSource(SQLModel, table = True):
    __tablename__ = "incomesource"
    id: str = Field(default_factory = uid, primary_key = True)
    userId: str = Field(index = True)
    accountId: str | None = Field(default=None, foreign_key = "accounts.id", index = True) #where the income lands
    sourceAccountId: str | None = Field(default=None, foreign_key = "accounts.id", index = True) # only set for internal tranfers (savings --> chequing or chequing --> savings)
    isInternalTransfer: bool = Field(default=False) # true = moving money between own accounts excluded from safe to spend calculations
    name: str
    amountToCent: int
    frequency: IncomeFrequency
    anchorDate: date # a known payday
    active: bool = Field(default=True)
    createdAt: datetime = Field(default_factory = nowUtc)

# cached table of a users habits. Powered by k-means
class HabitProfile(SQLModel, table = True):
    __tablename__ = "habitprofile"
    id: str = Field(default_factory = uid, primary_key = True)
    userId: str = Field(index = True, unique = True)
    clustersJson: str  # serialized cluster labels + profiles
    currentClusterLabel: str | None = Field(default=None)
    computedAt: datetime = Field(default_factory = nowUtc)