
#set document(title: "Typst 이미지 시험지 생성 결과")
#set page(
  paper: "a4",
  margin: (x: 1.5cm, y: 2cm),
  numbering: "1",
)
#set text(font: "Noto Sans CJK KR", size: 10pt)
#set heading(numbering: "1.")

#let primary = rgb("#1a237e")

#align(center)[
  #text(size: 20pt, weight: "bold", fill: primary)[Typst 이미지 시험지 생성 결과]
  #v(1em)
]

#grid(
  columns: (1fr, 1fr),
  column-gap: 20pt,
  row-gap: 15pt,

  [
    *1.* [5점]
    $2^3  times  3^2$의 값은?
    
    #v(0.5em)
#image("/mnt/d/progress/mathesis/node20_Exam Builder/dataset/110.수학 과목 자동 풀이 데이터/3.개방데이터/1.데이터/Training/01.원천데이터/TS_1.문제_고등학교_공통수학/H_1_01_25766_84186.png", width: 90%)
#v(0.5em)
    
    
#v(0.5em)
① 12   ② 18   ③ 36   ④ 72   ⑤ 108
    
    #v(1fr)
  ],
)