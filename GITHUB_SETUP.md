# GitHub-ზე ატვირთვა (valerashonia@gmail.com)

## 1. Xcode ლიცენზია (ერთხელ)

თუ Terminal-ში `git` აჩვენებს შეცდომას Xcode-ის ლიცენზიაზე, ჯერ გაუშვი:

```bash
sudo xcodebuild -license
```

დააჭირე space-ს ბოლომდე წასაკითხად, ბოლოში მიიღე ლიცენზია (`agree`).

---

## 2. Git რეპოზიტორიის შექმნა პროექტში

Terminal-ში:

```bash
cd /Users/mac/Documents/DocumentScannerAi

# რეპოზიტორიის ინიციალიზება
git init

# ყველა ფაილის დამატება (.gitignore-ის მიხედვით)
git add .

# პირველი commit
git commit -m "Initial commit: SimpleScan document scanner app"
```

---

## 3. GitHub-ზე ახალი რეპოზიტორიის შექმნა

1. გახსენი **https://github.com** და შედი იმ ანგარიშით, რომელიც უკავშირდება **valerashonia@gmail.com**.
2. მარჯვენა ზედა კუთხეში დააჭირე **"+"** → **"New repository"**.
3. **Repository name:** მაგ. `DocumentScannerAi` ან `SimpleScan` (რაც გინდა).
4. **Description:** (არასავალდებულო) მაგ. "SimpleScan – document scanner app".
5. **Public** დატოვე.
6. **არ დააჭირო** "Add a README" / "Add .gitignore" – რეპოზიტორია ცარიელი უნდა იყოს.
7. დააჭირე **"Create repository"**.

---

## 4. ლოკალური კოდის GitHub-თან დაკავშირება და ატვირთვა

GitHub-მა გაჩვენებს ბრძანებებს. ან ხელით გაუშვი (ჩაანაცვლე `YOUR_USERNAME` და `YOUR_REPO_NAME` თქვენი მონაცემებით):

```bash
cd /Users/mac/Documents/DocumentScannerAi

# მაგალითი: თუ GitHub username არის valerashonia და repo სახელი DocumentScannerAi
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# ან SSH-ით (თუ SSH გასაღები გაქვს უკვე დაყენებული):
# git remote add origin git@github.com:YOUR_USERNAME/YOUR_REPO_NAME.git

# ფილიალის სახელის დაყენება (სურვილისამებრ)
git branch -M main

# კოდის GitHub-ზე გაგზავნა
git push -u origin main
```

**პირველი push-ისას** GitHub მოითხოვს ავტორიზაციას (browser-ში login ან Personal Access Token). ანგარიში valerashonia@gmail.com-ით უნდა იყოს დაკავშირებული.

---

## 5. შემდეგ ცვლილებების ატვირთვა

როცა რამეს შეცვლი და გინდა ჩანაწერი GitHub-ზე:

```bash
cd /Users/mac/Documents/DocumentScannerAi
git add .
git commit -m "აღწერა რა შეცვალე"
git push
```

---

**რეზიუმე:** ჯერ Xcode ლიცენზია დააჭირე (თუ საჭიროა), შემდეგ `git init` → `git add .` → `git commit` პროექტის ფოლდერში, შემდეგ GitHub-ზე ცარიელი repo შექმენი და `git remote add origin ...` + `git push -u origin main` გაუშვი.
