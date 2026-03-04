import './PregnancyInfo.css'

const WEEKLY_INFO = {
  4: { size: '양귀비 씨앗', length: '1mm', desc: '착상이 완료되고 세포 분열이 시작됩니다.' },
  5: { size: '참깨', length: '2mm', desc: '심장이 형성되기 시작하고 뇌가 발달합니다.' },
  6: { size: '렌즈콩', length: '5mm', desc: '심장이 뛰기 시작합니다! 작은 팔다리 싹이 나옵니다.' },
  7: { size: '블루베리', length: '1cm', desc: '얼굴 윤곽이 형성되고 뇌가 빠르게 자랍니다.' },
  8: { size: '강낭콩', length: '1.6cm', desc: '손가락과 발가락이 구분되기 시작합니다.' },
  9: { size: '포도알', length: '2.3cm', desc: '태아의 주요 장기가 모두 형성되었습니다.' },
  10: { size: '금귤', length: '3.1cm', desc: '손톱이 자라기 시작하고 활발히 움직입니다.' },
  11: { size: '무화과', length: '4.1cm', desc: '뼈가 단단해지고 피부가 투명합니다.' },
  12: { size: '라임', length: '5.4cm', desc: '성별 구분이 가능해지고 반사 반응이 나타납니다.' },
  13: { size: '레몬', length: '7cm', desc: '안정기 진입! 지문이 형성됩니다.' },
  14: { size: '복숭아', length: '8.7cm', desc: '얼굴 표정을 지을 수 있습니다.' },
  15: { size: '사과', length: '10cm', desc: '솜털(태모)이 자라고 빛을 감지합니다.' },
  16: { size: '아보카도', length: '11.6cm', desc: '태동을 느낄 수 있습니다! 뼈가 더 단단해집니다.' },
  17: { size: '배', length: '13cm', desc: '지방이 축적되기 시작하고 청각이 발달합니다.' },
  18: { size: '고구마', length: '14.2cm', desc: '하품, 딸꾹질을 합니다. 성별 확인 가능.' },
  19: { size: '망고', length: '15.3cm', desc: '감각이 급속히 발달하고 움직임이 활발합니다.' },
  20: { size: '바나나', length: '25cm', desc: '절반 지점! 엄마 목소리를 들을 수 있습니다.' },
  21: { size: '당근', length: '26.7cm', desc: '눈썹과 속눈썹이 자랍니다.' },
  22: { size: '파파야', length: '27.8cm', desc: '눈이 형성되고 소리에 반응합니다.' },
  23: { size: '자몽', length: '28.9cm', desc: '폐가 발달하고 빠른 안구 운동이 시작됩니다.' },
  24: { size: '옥수수', length: '30cm', desc: '얼굴이 거의 완성되고 미각이 생깁니다.' },
  25: { size: '순무', length: '34.6cm', desc: '손을 쥐는 힘이 세져요. 지방이 쌓입니다.' },
  26: { size: '대파', length: '35.6cm', desc: '눈을 뜰 수 있고 면역 체계가 발달합니다.' },
  27: { size: '콜리플라워', length: '36.6cm', desc: '뇌가 활발히 활동하고 수면 패턴이 생깁니다.' },
  28: { size: '가지', length: '37.6cm', desc: '눈을 깜빡이고 꿈을 꿉니다.' },
  29: { size: '호박', length: '38.6cm', desc: '뼈가 단단해지고 머리카락이 자랍니다.' },
  30: { size: '양배추', length: '39.9cm', desc: '폐가 성숙해지고 체온 조절이 시작됩니다.' },
  31: { size: '코코넛', length: '41.1cm', desc: '모든 감각이 작동하고 급속히 성장합니다.' },
  32: { size: '스쿼시', length: '42.4cm', desc: '발톱이 자라고 피부가 부드러워집니다.' },
  33: { size: '파인애플', length: '43.7cm', desc: '뼈가 단단해지지만 두개골은 유연합니다.' },
  34: { size: '멜론', length: '45cm', desc: '면역 체계가 발달하고 출산 준비를 합니다.' },
  35: { size: '허니듀 멜론', length: '46.2cm', desc: '거의 모든 장기가 완성되었습니다.' },
  36: { size: '상추(한 포기)', length: '47.4cm', desc: '골반으로 내려오고 폐가 완전히 성숙합니다.' },
  37: { size: '근대', length: '48.6cm', desc: '만삭! 언제든 태어날 준비가 되었습니다.' },
  38: { size: '대파(큰것)', length: '49.8cm', desc: '장기가 모두 완성되고 멜라닌이 생깁니다.' },
  39: { size: '수박(작은것)', length: '50.7cm', desc: '태지가 줄고 출생 준비가 완료됩니다.' },
  40: { size: '수박', length: '51.2cm', desc: '예정일! 아기를 만날 시간입니다.' },
}

export default function PregnancyInfo({ dueDate }) {
  if (!dueDate) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate + 'T00:00:00')
  const start = new Date(due)
  start.setDate(start.getDate() - 280)
  const elapsed = Math.floor((today - start) / (1000 * 60 * 60 * 24))
  const currentWeek = Math.floor(elapsed / 7)
  const currentDay = elapsed % 7

  if (currentWeek < 4 || currentWeek > 42) return null

  const info = WEEKLY_INFO[currentWeek] || WEEKLY_INFO[Math.min(currentWeek, 40)]
  if (!info) return null

  return (
    <div className="pregnancy-info">
      <div className="pregnancy-info__card">
        <div className="pregnancy-info__header">
          <div className="pregnancy-info__week">{currentWeek}주 {currentDay}일</div>
          <div className="pregnancy-info__trimester">
            {currentWeek < 14 ? '1분기' : currentWeek < 28 ? '2분기' : '3분기'}
          </div>
        </div>
        <div className="pregnancy-info__body">
          <div className="pregnancy-info__size">
            <span className="pregnancy-info__size-label">크기</span>
            <span className="pregnancy-info__size-value">{info.size}</span>
            <span className="pregnancy-info__size-length">약 {info.length}</span>
          </div>
          <div className="pregnancy-info__desc">{info.desc}</div>
        </div>
        <div className="pregnancy-info__progress">
          <div className="pregnancy-info__progress-bar">
            <div
              className="pregnancy-info__progress-fill"
              style={{ width: `${Math.min(100, (elapsed / 280) * 100)}%` }}
            />
          </div>
          <div className="pregnancy-info__progress-label">
            {Math.round((elapsed / 280) * 100)}% 완료
          </div>
        </div>
      </div>
    </div>
  )
}
